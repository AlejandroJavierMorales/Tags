import { createHash } from "node:crypto";

import { db } from "@/app/lib/tags-db";
import { getRequestBaseUrl } from "@/app/lib/channelContext";
import { ensureEventAttendeeCredential } from "@/app/modules/e-events/lib/ensureEventAttendeeCredential";
import { getEventMercadoPagoPayment, validEventMercadoPagoSignature } from "@/app/modules/e-events/lib/eventMercadoPago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function paymentIdFromReference(value) {
    const match = String(value || "").match(/^event_payment:(\d+)$/);
    return match ? Number(match[1]) : 0;
}

export async function POST(request) {
    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);
    const resourceId = body?.data?.id || body?.id || url.searchParams.get("data.id");
    const businessId = Number(url.searchParams.get("businessId") || 0);
    const eventType = String(body?.type || body?.topic || body?.action || "");
    if (!resourceId || !businessId) return Response.json({ ok: true, ignored: true });

    try {
        const [[account]] = await db.query(
            `SELECT id,business_id,is_active,encrypted_access_token,encrypted_webhook_secret
               FROM tags_event_payment_accounts
              WHERE business_id=? AND provider='mercadopago'
              LIMIT 1`,
            [businessId]
        );
        if (!account || !account.encrypted_access_token || !account.encrypted_webhook_secret) {
            return Response.json({ error: "Cuenta de cobro no disponible" }, { status: 401 });
        }
        if (!validEventMercadoPagoSignature(request, resourceId, account.encrypted_webhook_secret)) {
            return Response.json({ error: "Webhook no autorizado" }, { status: 401 });
        }
        if (eventType && !eventType.toLowerCase().includes("payment")) {
            return Response.json({ ok: true, ignored: true });
        }

        const requestId = request.headers.get("x-request-id") || "";
        const eventKey = requestId || createHash("sha256").update(`${eventType}:${resourceId}:${JSON.stringify(body)}`).digest("hex");
        const [insert] = await db.query(
            `INSERT IGNORE INTO tags_event_payment_provider_events
                (provider,event_key,account_id,event_type,resource_id,request_id,processing_status,payload_json,created_at,updated_at)
             VALUES ('mercadopago',?,?,?,?,?,'received',?,NOW(),NOW())`,
            [eventKey, account.id, eventType || null, String(resourceId), requestId || null, JSON.stringify(body)]
        );
        if (!insert.affectedRows) {
            const [retry] = await db.query(
                `UPDATE tags_event_payment_provider_events
                    SET processing_status='received',error_message=NULL,processed_at=NULL,updated_at=NOW()
                  WHERE provider='mercadopago' AND event_key=? AND processing_status='failed'`,
                [eventKey]
            );
            if (!retry.affectedRows) return Response.json({ ok: true, duplicate: true });
        }

        let localPaymentId = 0;
        try {
            const providerPayment = await getEventMercadoPagoPayment(account.encrypted_access_token, resourceId);
            localPaymentId = Number(providerPayment.metadata?.event_payment_id || paymentIdFromReference(providerPayment.external_reference));
            if (!localPaymentId) {
                await db.query(
                    `UPDATE tags_event_payment_provider_events
                        SET processing_status='ignored',processed_at=NOW(),updated_at=NOW()
                      WHERE provider='mercadopago' AND event_key=?`,
                    [eventKey]
                );
                return Response.json({ ok: true, ignored: true });
            }

            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();
                const [[payment]] = await connection.query(
                    `SELECT pay.id,pay.amount,pay.currency,pay.status,pay.attendee_id,pay.event_id,
                            pay.provider_preference_id,pay.provider_payment_id,
                            e.business_id,a.status AS attendee_status,s.confirmation_mode
                       FROM tags_event_registration_payments pay
                       INNER JOIN tags_events e ON e.id=pay.event_id
                       INNER JOIN tags_event_attendees a ON a.id=pay.attendee_id
                       INNER JOIN tags_event_registration_settings s ON s.event_id=pay.event_id
                      WHERE pay.id=? AND pay.provider='mercadopago'
                      LIMIT 1 FOR UPDATE`,
                    [localPaymentId]
                );
                if (!payment || Number(payment.business_id) !== Number(account.business_id)) {
                    await connection.rollback();
                    await db.query(
                        `UPDATE tags_event_payment_provider_events
                            SET processing_status='ignored',processed_at=NOW(),updated_at=NOW()
                          WHERE provider='mercadopago' AND event_key=?`,
                        [eventKey]
                    );
                    return Response.json({ ok: true, ignored: true });
                }

                const providerStatus = String(providerPayment.status || "pending");
                const amount = Number(providerPayment.transaction_amount || 0);
                const currency = String(providerPayment.currency_id || "").toUpperCase();
                if (providerStatus === "approved" && (Math.abs(amount - Number(payment.amount)) > 0.01 || currency !== String(payment.currency).toUpperCase())) {
                    throw Object.assign(new Error("El importe o la moneda no coinciden con la inscripción"), { status: 409 });
                }

                const localStatus = providerStatus === "approved" ? "approved"
                    : ["refunded", "charged_back"].includes(providerStatus) ? "refunded"
                    : ["rejected", "cancelled"].includes(providerStatus) ? "rejected" : "pending";
                const incomingPreferenceId = providerPayment.preference_id ? String(providerPayment.preference_id) : "";
                if (payment.provider_preference_id && incomingPreferenceId && String(payment.provider_preference_id) !== incomingPreferenceId && localStatus !== "approved") {
                    await connection.query(
                        `UPDATE tags_event_payment_provider_events
                            SET registration_payment_id=?,processing_status='ignored',processed_at=NOW(),updated_at=NOW()
                          WHERE provider='mercadopago' AND event_key=?`,
                        [payment.id, eventKey]
                    );
                    await connection.commit();
                    return Response.json({ ok: true, ignored: true, reason: "stale_payment_attempt" });
                }
                if (payment.status === "approved" && localStatus !== "refunded") {
                    if (localStatus === "approved" && payment.provider_payment_id && String(payment.provider_payment_id) !== String(providerPayment.id)) {
                        throw Object.assign(new Error("Se detectó más de un pago aprobado para la misma inscripción"), { status: 409 });
                    }
                    await connection.query(
                        `UPDATE tags_event_payment_provider_events
                            SET registration_payment_id=?,processing_status='processed',processed_at=NOW(),updated_at=NOW()
                          WHERE provider='mercadopago' AND event_key=?`,
                        [payment.id, eventKey]
                    );
                    await connection.commit();
                    return Response.json({ ok: true, duplicate: true, status: "approved" });
                }
                await connection.query(
                    `UPDATE tags_event_registration_payments
                        SET status=?,provider_payment_id=?,provider_status=?,
                            provider_preference_id=COALESCE(?,provider_preference_id),raw_response_json=?,
                            paid_at=IF(?='approved',COALESCE(paid_at,NOW()),paid_at),updated_at=NOW()
                      WHERE id=?`,
                    [localStatus, String(providerPayment.id), providerStatus, incomingPreferenceId || null, JSON.stringify(providerPayment), localStatus, payment.id]
                );

                let credential = null;
                if (localStatus === "approved" && payment.confirmation_mode === "automatic" && payment.attendee_status === "pending") {
                    await connection.query(
                        `UPDATE tags_event_attendees
                            SET status='confirmed',confirmed_at=NOW(),declined_at=NULL,updated_at=NOW()
                          WHERE id=? AND status='pending'`,
                        [payment.attendee_id]
                    );
                    credential = await ensureEventAttendeeCredential({
                        connection,
                        attendeeId: payment.attendee_id,
                        baseUrl: getRequestBaseUrl(request)
                    });
                }
                await connection.query(
                    `UPDATE tags_event_payment_provider_events
                        SET registration_payment_id=?,processing_status='processed',processed_at=NOW(),updated_at=NOW()
                      WHERE provider='mercadopago' AND event_key=?`,
                    [payment.id, eventKey]
                );
                await connection.commit();
                return Response.json({ ok: true, status: localStatus, credentialCreated: Boolean(credential) });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            await db.query(
                `UPDATE tags_event_payment_provider_events
                    SET registration_payment_id=?,processing_status='failed',error_message=?,processed_at=NOW(),updated_at=NOW()
                  WHERE provider='mercadopago' AND event_key=?`,
                [localPaymentId || null, String(error?.message || error).slice(0, 2000), eventKey]
            );
            throw error;
        }
    } catch (error) {
        console.error("EVENT MERCADOPAGO WEBHOOK ERROR", error);
        return Response.json({ error: error?.message || "No se pudo procesar la notificación" }, { status: error?.status || 500 });
    }
}
