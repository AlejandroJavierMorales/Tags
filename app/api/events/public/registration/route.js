import { db } from "@/app/lib/tags-db";
import { getRequestBaseUrl } from "@/app/lib/channelContext";
import { ensureEventAttendeeCredential } from "@/app/modules/e-events/lib/ensureEventAttendeeCredential";
import { countOccupiedEventSeats, createRegistrationAccessToken, registrationAvailability } from "@/app/modules/e-events/lib/eventRegistration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanEmail(value) {
    const email = String(value || "").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function requestMetadata(request) {
    return {
        ip: String(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "").split(",")[0].trim().slice(0, 64) || null,
        userAgent: String(request.headers.get("user-agent") || "").slice(0, 500) || null
    };
}

async function publicEventBySlug(connection, slug, lock = false) {
    const [rows] = await connection.query(
        `SELECT e.id,e.business_id,e.product_code,e.name,e.description,e.location,e.starts_at,e.ends_at,e.cover_image,e.status,
                s.public_slug,s.registration_enabled,s.confirmation_mode,s.capacity,s.registration_opens_at,
                s.registration_closes_at,s.public_title,s.public_description,s.success_message,s.require_phone,s.terms_text,
                COALESCE(ps.payment_mode,'free') AS payment_mode,ps.ticket_price,COALESCE(ps.currency,'ARS') AS currency,
                ps.manual_payment_title,ps.manual_payment_instructions,ps.manual_payment_holder,
                ps.manual_payment_alias,ps.manual_payment_cbu,
                account.id AS payment_account_id,account.is_active AS payment_account_active,
                account.encrypted_access_token IS NOT NULL AS payment_access_token_configured,
                account.encrypted_webhook_secret IS NOT NULL AS payment_webhook_secret_configured,
                b.name AS business_name
           FROM tags_event_registration_settings s
           INNER JOIN tags_events e ON e.id=s.event_id
           INNER JOIN tags_businesses b ON b.id=e.business_id
           LEFT JOIN tags_event_payment_settings ps ON ps.event_id=e.id
           LEFT JOIN tags_event_payment_accounts account
                  ON account.business_id=e.business_id AND account.provider='mercadopago'
          WHERE s.public_slug=?
            AND EXISTS (
                SELECT 1 FROM tags_business_addons ba
                 WHERE ba.business_id=e.business_id
                   AND TRIM(LOWER(ba.addon_code))=e.product_code
                   AND ba.status='active'
                   AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())
            )
          LIMIT 1${lock ? " FOR UPDATE" : ""}`,
        [slug]
    );
    return rows[0] || null;
}

export async function GET(request) {
    const slug = String(new URL(request.url).searchParams.get("slug") || "").trim();
    if (!slug) return Response.json({ error: "Evento no encontrado" }, { status: 404 });
    try {
        const event = await publicEventBySlug(db, slug);
        if (!event) return Response.json({ error: "Evento no encontrado" }, { status: 404 });
        const occupied = await countOccupiedEventSeats(db, event.id);
        const availability = registrationAvailability(event, event, occupied);
        if (event.payment_mode === "mercadopago" && (Number(event.payment_account_active) !== 1 || Number(event.payment_access_token_configured) !== 1 || Number(event.payment_webhook_secret_configured) !== 1)) {
            availability.available = false;
            availability.code = "payment_unavailable";
            availability.message = "El cobro online todavía no está disponible para este evento.";
        }
        return Response.json({ ok: true, event, availability });
    } catch (error) {
        console.error("PUBLIC EVENT REGISTRATION GET ERROR", error);
        return Response.json({ error: "No se pudo cargar el evento" }, { status: 500 });
    }
}

export async function POST(request) {
    const body = await request.json().catch(() => null);
    const slug = String(body?.slug || "").trim();
    const name = String(body?.name || "").trim().slice(0, 255);
    const email = cleanEmail(body?.email);
    const phone = String(body?.phone || "").trim().slice(0, 50);
    const metadata = requestMetadata(request);

    if (!slug || !name || !email) {
        return Response.json({ error: "Nombre y email son obligatorios" }, { status: 400 });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const event = await publicEventBySlug(connection, slug, true);
        if (!event) {
            await connection.rollback();
            return Response.json({ error: "Evento no encontrado" }, { status: 404 });
        }
        if (Number(event.require_phone) === 1 && !phone) {
            await connection.rollback();
            return Response.json({ error: "El teléfono es obligatorio" }, { status: 400 });
        }
        if (event.terms_text && body?.acceptedTerms !== true) {
            await connection.rollback();
            return Response.json({ error: "Debés aceptar las condiciones de inscripción" }, { status: 400 });
        }
        if (event.payment_mode === "mercadopago" && (Number(event.payment_account_active) !== 1 || Number(event.payment_access_token_configured) !== 1 || Number(event.payment_webhook_secret_configured) !== 1)) {
            await connection.rollback();
            return Response.json({ error: "El cobro online todavía no está disponible para este evento" }, { status: 409 });
        }

        const occupied = await countOccupiedEventSeats(connection, event.id);
        const availability = registrationAvailability(event, event, occupied);
        if (!availability.available) {
            await connection.rollback();
            return Response.json({ error: availability.message, availability }, { status: 409 });
        }

        const [[existing]] = await connection.query(
            `SELECT id,status FROM tags_event_attendees
              WHERE event_id=? AND LOWER(email)=? AND status IN ('pending','confirmed','checked_in')
              LIMIT 1`,
            [event.id, email]
        );
        if (existing) {
            await connection.rollback();
            return Response.json({ error: "Ya existe una inscripción vigente para ese email" }, { status: 409 });
        }

        const paymentRequired = ["manual", "mercadopago"].includes(event.payment_mode);
        const automatic = event.confirmation_mode === "automatic" && !paymentRequired;
        const [attendeeResult] = await connection.query(
            `INSERT INTO tags_event_attendees
                (event_id,name,email,phone,status,invitation_status,confirmed_at,internal_notes,created_at,updated_at)
             VALUES (?,?,?,?,?,'not_sent',?,NULL,NOW(),NOW())`,
            [event.id, name, email, phone || null, automatic ? "confirmed" : "pending", automatic ? new Date() : null]
        );

        const access = createRegistrationAccessToken();
        const [registrationResult] = await connection.query(
            `INSERT INTO tags_event_registrations
                (event_id,attendee_id,access_token_hash,source,seats,accepted_terms_at,requester_ip,requester_user_agent,created_at,updated_at)
             VALUES (?,?,?,'public_web',1,?,?,?,NOW(),NOW())`,
            [event.id, attendeeResult.insertId, access.hash, event.terms_text ? new Date() : null, metadata.ip, metadata.userAgent]
        );

        if (paymentRequired) {
            await connection.query(
                `INSERT INTO tags_event_registration_payments
                    (registration_id,event_id,attendee_id,provider,status,amount,currency,created_at,updated_at)
                 VALUES (?,?,?,?,'pending',?,?,NOW(),NOW())`,
                [registrationResult.insertId, event.id, attendeeResult.insertId, event.payment_mode, Number(event.ticket_price), event.currency || "ARS"]
            );
        }

        let credential = null;
        if (automatic) {
            credential = await ensureEventAttendeeCredential({
                connection,
                attendeeId: attendeeResult.insertId,
                baseUrl: getRequestBaseUrl(request)
            });
        }

        await connection.commit();
        return Response.json({
            ok: true,
            status: paymentRequired ? "awaiting_payment" : automatic ? "confirmed" : "pending",
            message: event.success_message || (paymentRequired
                ? event.payment_mode === "mercadopago"
                    ? "Tu lugar fue solicitado. Completá el pago con Mercado Pago para continuar."
                    : "Tu lugar fue solicitado. Cargá el comprobante para que podamos validar el pago."
                : automatic
                ? "Tu inscripción fue confirmada."
                : "Recibimos tu solicitud. Te avisaremos cuando sea confirmada."),
            statusUrl: `/eventos/inscripcion/${access.token}`,
            credentialUrl: credential ? `/e/access/${credential.qrToken}` : null
        });
    } catch (error) {
        await connection.rollback();
        console.error("PUBLIC EVENT REGISTRATION CREATE ERROR", error);
        const message = error?.message === "EVENT_QR_PRODUCT_NOT_FOUND"
            ? "No está configurado el tipo de QR para asistentes"
            : "No se pudo completar la inscripción";
        return Response.json({ error: message }, { status: 500 });
    } finally {
        connection.release();
    }
}
