import { db } from "@/app/lib/tags-db";
import { getRequestBaseUrl } from "@/app/lib/channelContext";
import { createEventMercadoPagoPreference } from "@/app/modules/e-events/lib/eventMercadoPago";
import { hashRegistrationAccessToken } from "@/app/modules/e-events/lib/eventRegistration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
    const body = await request.json().catch(() => null);
    const token = String(body?.token || "");
    if (token.length < 32) return Response.json({ error: "Inscripción no encontrada" }, { status: 404 });

    let payment = null;
    try {
        const [[row]] = await db.query(
            `SELECT pay.id,pay.status,pay.provider_status,pay.provider_preference_id,pay.payment_url,
                    pay.amount,pay.currency,r.id AS registration_id,a.name,a.email,a.status AS attendee_status,
                    e.id AS event_id,e.name AS event_name,e.business_id,s.public_slug,
                    account.id AS account_id,account.is_active,account.encrypted_access_token
               FROM tags_event_registrations r
               INNER JOIN tags_event_registration_payments pay ON pay.registration_id=r.id AND pay.provider='mercadopago'
               INNER JOIN tags_event_attendees a ON a.id=r.attendee_id
               INNER JOIN tags_events e ON e.id=r.event_id
               INNER JOIN tags_event_registration_settings s ON s.event_id=e.id
               LEFT JOIN tags_event_payment_accounts account
                      ON account.business_id=e.business_id AND account.provider='mercadopago'
              WHERE r.access_token_hash=?
              LIMIT 1`,
            [hashRegistrationAccessToken(token)]
        );
        payment = row;
        if (!payment) return Response.json({ error: "Pago no encontrado" }, { status: 404 });
        if (payment.status === "approved") return Response.json({ ok: true, approved: true });
        if (!["pending", "rejected"].includes(payment.status) || payment.attendee_status !== "pending") {
            return Response.json({ error: "La inscripción ya no admite iniciar este pago" }, { status: 409 });
        }
        if (payment.payment_url && payment.provider_preference_id && ["preference_created", "pending", "in_process"].includes(payment.provider_status)) {
            return Response.json({ ok: true, reused: true, initPoint: payment.payment_url });
        }
        if (!payment.account_id || Number(payment.is_active) !== 1 || !payment.encrypted_access_token) {
            return Response.json({ error: "Mercado Pago no está disponible para este evento" }, { status: 409 });
        }

        const [claim] = await db.query(
            `UPDATE tags_event_registration_payments
                SET provider_status='creating',updated_at=NOW()
              WHERE id=? AND status IN ('pending','rejected')
                AND (provider_status IS NULL OR provider_status IN ('rejected','cancelled','create_failed')
                     OR (provider_status='creating' AND updated_at<DATE_SUB(NOW(),INTERVAL 2 MINUTE)))`,
            [payment.id]
        );
        if (!claim.affectedRows) {
            return Response.json({ error: "El enlace de pago se está generando. Intentá nuevamente en unos segundos." }, { status: 409 });
        }

        const baseUrl = getRequestBaseUrl(request);
        const statusUrl = `${baseUrl}/eventos/inscripcion/${encodeURIComponent(token)}`;
        const preference = await createEventMercadoPagoPreference(payment.encrypted_access_token, {
            items: [{
                id: String(payment.event_id),
                title: `Inscripción · ${payment.event_name}`.slice(0, 250),
                quantity: 1,
                unit_price: Number(payment.amount),
                currency_id: payment.currency || "ARS"
            }],
            payer: { name: payment.name || undefined, email: payment.email || undefined },
            external_reference: `event_payment:${payment.id}`,
            metadata: {
                event_payment_id: Number(payment.id),
                registration_id: Number(payment.registration_id),
                event_id: Number(payment.event_id),
                business_id: Number(payment.business_id),
                account_id: Number(payment.account_id)
            },
            notification_url: `${baseUrl}/api/events/payments/mercadopago/webhook?businessId=${payment.business_id}`,
            back_urls: { success: statusUrl, pending: statusUrl, failure: statusUrl },
            auto_return: "approved",
            statement_descriptor: "TAGS EVENTOS"
        });
        if (!preference?.id || !preference?.init_point) throw new Error("Mercado Pago no devolvió el enlace de pago");

        await db.query(
            `UPDATE tags_event_registration_payments
                SET status='pending',provider_preference_id=?,provider_status='preference_created',
                    payment_url=?,raw_response_json=?,updated_at=NOW()
              WHERE id=?`,
            [String(preference.id), preference.init_point, JSON.stringify(preference), payment.id]
        );
        return Response.json({ ok: true, preferenceId: preference.id, initPoint: preference.init_point });
    } catch (error) {
        if (payment?.id) {
            await db.query(
                `UPDATE tags_event_registration_payments
                    SET provider_status='create_failed',updated_at=NOW()
                  WHERE id=? AND provider_status='creating'`,
                [payment.id]
            ).catch(() => null);
        }
        console.error("EVENT MERCADOPAGO PREFERENCE ERROR", error);
        return Response.json({ error: error?.status === 503 ? error.message : "No se pudo iniciar el pago con Mercado Pago" }, { status: error?.status || 500 });
    }
}
