import { db } from "@/app/lib/tags-db";
import { eventAccessError, requireEventAccess } from "@/app/modules/e-events/lib/eventApiAccess";
import { countOccupiedEventSeats, normalizeEventSlug, registrationAvailability } from "@/app/modules/e-events/lib/eventRegistration";
import { encryptEventPaymentSecret } from "@/app/modules/e-events/lib/eventMercadoPago";
import { getEventDirectoryRoute } from "@/app/modules/e-events/lib/eventPublicRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tableError(error) {
    return ["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code)
        ? Response.json({ error: "Falta ejecutar la migración de inscripciones de Tags Events" }, { status: 409 })
        : null;
}

export async function GET(request) {
    const eventId = Number(new URL(request.url).searchParams.get("eventId") || 0);
    const access = await requireEventAccess({ eventId, permission: "events.view" });
    if (!access.ok) return eventAccessError(access);

    try {
        const [[settings]] = await db.query(
            "SELECT * FROM tags_event_registration_settings WHERE event_id=? LIMIT 1",
            [eventId]
        );
        const [[paymentSettings]] = await db.query(
            "SELECT * FROM tags_event_payment_settings WHERE event_id=? LIMIT 1",
            [eventId]
        );
        const [[paymentAccount]] = await db.query(
            `SELECT id,is_active,account_name,account_email,
                    encrypted_access_token IS NOT NULL AS access_token_configured,
                    encrypted_webhook_secret IS NOT NULL AS webhook_secret_configured
               FROM tags_event_payment_accounts
              WHERE business_id=? AND provider='mercadopago'
              LIMIT 1`,
            [access.event.business_id]
        );
        const occupied = await countOccupiedEventSeats(db, eventId);
        const directoryRoute = await getEventDirectoryRoute({ eventId }).catch(() => null);
        const resolved = settings || {
            event_id: eventId,
            public_slug: `${normalizeEventSlug(access.event.name) || "evento"}-${eventId}`,
            registration_enabled: 0,
            confirmation_mode: "manual",
            capacity: null,
            registration_opens_at: null,
            registration_closes_at: null,
            public_title: access.event.name,
            public_description: null,
            success_message: null,
            require_phone: 1,
            terms_text: null
        };
        return Response.json({
            ok: true,
            event: access.event,
            settings: resolved,
            paymentSettings: paymentSettings || {
                event_id: eventId,
                payment_mode: "free",
                ticket_price: null,
                currency: "ARS",
                manual_payment_title: null,
                manual_payment_instructions: null,
                manual_payment_holder: null,
                manual_payment_alias: null,
                manual_payment_cbu: null
            },
            paymentAccount: paymentAccount || {
                is_active: 0,
                account_name: null,
                account_email: null,
                access_token_configured: 0,
                webhook_secret_configured: 0
            },
            publicRoute: directoryRoute,
            availability: registrationAvailability(resolved, access.event, occupied)
        });
    } catch (error) {
        const response = tableError(error);
        if (response) return response;
        if (error?.status) return Response.json({ error: error.message }, { status: error.status });
        console.error("EVENT REGISTRATION SETTINGS GET ERROR", error);
        return Response.json({ error: "No se pudo cargar la configuración" }, { status: 500 });
    }
}

export async function PUT(request) {
    const body = await request.json().catch(() => null);
    const eventId = Number(body?.eventId || 0);
    const access = await requireEventAccess({ eventId, permission: "settings.manage" });
    if (!access.ok) return eventAccessError(access);

    const publicSlug = normalizeEventSlug(body?.publicSlug);
    const confirmationMode = body?.confirmationMode === "automatic" ? "automatic" : "manual";
    const capacity = body?.capacity === "" || body?.capacity == null ? null : Number(body.capacity);
    const opensAt = body?.registrationOpensAt || null;
    const closesAt = body?.registrationClosesAt || null;
    const paymentMode = ["manual", "mercadopago"].includes(body?.paymentMode) ? body.paymentMode : "free";
    const ticketPrice = paymentMode !== "free" ? Number(body?.ticketPrice || 0) : null;
    const currency = ["ARS", "USD"].includes(body?.currency) ? body.currency : "ARS";
    const mercadoPagoAccessToken = String(body?.mercadoPagoAccessToken || "").trim();
    const mercadoPagoWebhookSecret = String(body?.mercadoPagoWebhookSecret || "").trim();
    const mercadoPagoAccountActive = body?.mercadoPagoAccountActive === true;

    if (!publicSlug || (capacity !== null && (!Number.isInteger(capacity) || capacity < 1))) {
        return Response.json({ error: "Revisá la ruta pública y el cupo" }, { status: 400 });
    }
    if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) {
        return Response.json({ error: "El cierre debe ser posterior a la apertura" }, { status: 400 });
    }
    if (paymentMode !== "free" && (!Number.isFinite(ticketPrice) || ticketPrice <= 0)) {
        return Response.json({ error: "Ingresá un importe válido para la inscripción" }, { status: 400 });
    }
    if (paymentMode === "mercadopago" && currency !== "ARS") {
        return Response.json({ error: "Los cobros de Mercado Pago para esta integración deben configurarse en pesos argentinos" }, { status: 400 });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [[existingAccount]] = await connection.query(
            `SELECT id,encrypted_access_token,encrypted_webhook_secret
               FROM tags_event_payment_accounts
              WHERE business_id=? AND provider='mercadopago'
              LIMIT 1 FOR UPDATE`,
            [access.event.business_id]
        );
        const hasAccessToken = Boolean(mercadoPagoAccessToken || existingAccount?.encrypted_access_token);
        const hasWebhookSecret = Boolean(mercadoPagoWebhookSecret || existingAccount?.encrypted_webhook_secret);
        if (paymentMode === "mercadopago" && (!mercadoPagoAccountActive || !hasAccessToken || !hasWebhookSecret)) {
            await connection.rollback();
            return Response.json({ error: "Activá la cuenta y completá el Access Token y la firma secreta del webhook de Mercado Pago" }, { status: 400 });
        }
        if (existingAccount && !mercadoPagoAccountActive) {
            const [[usage]] = await connection.query(
                `SELECT COUNT(*) AS total
                   FROM tags_event_payment_settings ps
                   INNER JOIN tags_event_registration_settings rs ON rs.event_id=ps.event_id
                   INNER JOIN tags_events e ON e.id=ps.event_id
                  WHERE e.business_id=? AND ps.payment_mode='mercadopago'
                    AND rs.registration_enabled=1 AND ps.event_id<>?`,
                [access.event.business_id, eventId]
            );
            if (Number(usage?.total || 0) > 0) {
                await connection.rollback();
                return Response.json({ error: "No podés desactivar la cuenta porque está siendo utilizada por otro evento con inscripciones abiertas" }, { status: 409 });
            }
        }
        await connection.query(
            `INSERT INTO tags_event_registration_settings
                (event_id,public_slug,registration_enabled,confirmation_mode,capacity,
                 registration_opens_at,registration_closes_at,public_title,public_description,
                 success_message,require_phone,terms_text,created_at,updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())
             ON DUPLICATE KEY UPDATE
                public_slug=VALUES(public_slug),registration_enabled=VALUES(registration_enabled),
                confirmation_mode=VALUES(confirmation_mode),capacity=VALUES(capacity),
                registration_opens_at=VALUES(registration_opens_at),registration_closes_at=VALUES(registration_closes_at),
                public_title=VALUES(public_title),public_description=VALUES(public_description),
                success_message=VALUES(success_message),require_phone=VALUES(require_phone),
                terms_text=VALUES(terms_text),updated_at=NOW()`,
            [
                eventId,
                publicSlug,
                body.registrationEnabled ? 1 : 0,
                confirmationMode,
                capacity,
                opensAt,
                closesAt,
                String(body.publicTitle || "").trim() || access.event.name,
                String(body.publicDescription || "").trim() || null,
                String(body.successMessage || "").trim() || null,
                body.requirePhone ? 1 : 0,
                String(body.termsText || "").trim() || null
            ]
        );
        if (existingAccount || mercadoPagoAccountActive || mercadoPagoAccessToken || mercadoPagoWebhookSecret || paymentMode === "mercadopago") {
            await connection.query(
                `INSERT INTO tags_event_payment_accounts
                    (business_id,provider,is_active,account_name,account_email,encrypted_access_token,encrypted_webhook_secret,created_at,updated_at)
                 VALUES (?,'mercadopago',?,?,?,?,?,NOW(),NOW())
                 ON DUPLICATE KEY UPDATE is_active=VALUES(is_active),account_name=VALUES(account_name),
                    account_email=VALUES(account_email),
                    encrypted_access_token=COALESCE(VALUES(encrypted_access_token),encrypted_access_token),
                    encrypted_webhook_secret=COALESCE(VALUES(encrypted_webhook_secret),encrypted_webhook_secret),updated_at=NOW()`,
                [
                    access.event.business_id,
                    mercadoPagoAccountActive ? 1 : 0,
                    String(body?.mercadoPagoAccountName || "").trim() || null,
                    String(body?.mercadoPagoAccountEmail || "").trim() || null,
                    mercadoPagoAccessToken ? encryptEventPaymentSecret(mercadoPagoAccessToken) : null,
                    mercadoPagoWebhookSecret ? encryptEventPaymentSecret(mercadoPagoWebhookSecret) : null
                ]
            );
        }
        await connection.query(
            `INSERT INTO tags_event_payment_settings
                (event_id,payment_mode,ticket_price,currency,manual_payment_title,
                 manual_payment_instructions,manual_payment_holder,manual_payment_alias,
                 manual_payment_cbu,created_at,updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())
             ON DUPLICATE KEY UPDATE payment_mode=VALUES(payment_mode),ticket_price=VALUES(ticket_price),
                currency=VALUES(currency),manual_payment_title=VALUES(manual_payment_title),
                manual_payment_instructions=VALUES(manual_payment_instructions),
                manual_payment_holder=VALUES(manual_payment_holder),manual_payment_alias=VALUES(manual_payment_alias),
                manual_payment_cbu=VALUES(manual_payment_cbu),updated_at=NOW()`,
            [
                eventId,
                paymentMode,
                ticketPrice,
                currency,
                String(body?.manualPaymentTitle || "").trim() || null,
                String(body?.manualPaymentInstructions || "").trim() || null,
                String(body?.manualPaymentHolder || "").trim() || null,
                String(body?.manualPaymentAlias || "").trim() || null,
                String(body?.manualPaymentCbu || "").trim() || null
            ]
        );
        await connection.commit();
        return Response.json({ ok: true, publicSlug });
    } catch (error) {
        await connection.rollback();
        const response = tableError(error);
        if (response) return response;
        if (error?.code === "ER_DUP_ENTRY") {
            return Response.json({ error: "Esa ruta pública ya está siendo utilizada" }, { status: 409 });
        }
        console.error("EVENT REGISTRATION SETTINGS SAVE ERROR", error);
        return Response.json({ error: "No se pudo guardar la configuración" }, { status: 500 });
    } finally {
        connection.release();
    }
}
