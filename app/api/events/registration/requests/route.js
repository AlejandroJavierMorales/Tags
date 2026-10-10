import { db } from "@/app/lib/tags-db";
import { getRequestBaseUrl } from "@/app/lib/channelContext";
import { ensureEventAttendeeCredential } from "@/app/modules/e-events/lib/ensureEventAttendeeCredential";
import { eventAccessError, requireEventAccess } from "@/app/modules/e-events/lib/eventApiAccess";
import { sendEventConfirmationEmail } from "@/app/modules/e-events/lib/eventRegistrationCommunications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    const url = new URL(request.url);
    const eventId = Number(url.searchParams.get("eventId") || 0);
    const status = String(url.searchParams.get("status") || "");
    const access = await requireEventAccess({ eventId, permission: "attendees.view" });
    if (!access.ok) return eventAccessError(access);

    const params = [eventId];
    const conditions = ["r.event_id=?"];
    if (["pending", "confirmed", "declined", "checked_in", "cancelled"].includes(status)) {
        conditions.push("a.status=?");
        params.push(status);
    }

    try {
        const [rows] = await db.query(
            `SELECT r.id AS registration_id,r.created_at AS registered_at,r.source,
                    a.id AS attendee_id,a.name,a.email,a.phone,a.status,a.confirmed_at,a.declined_at,
                    a.checked_in_at,a.qr_token,q.code AS qr_code,
                    pay.id AS payment_id,pay.provider AS payment_provider,pay.status AS payment_status,pay.provider_status,
                    pay.amount AS payment_amount,pay.currency AS payment_currency,pay.proof_url,
                    pay.proof_mime_type,pay.payer_reference,pay.attendee_notes,pay.review_notes,
                    COALESCE(ps.payment_mode,'free') AS payment_mode
               FROM tags_event_registrations r
               INNER JOIN tags_event_attendees a ON a.id=r.attendee_id
               LEFT JOIN tags_qr_codes q ON q.id=a.qr_code_id
               LEFT JOIN tags_event_payment_settings ps ON ps.event_id=r.event_id
               LEFT JOIN tags_event_registration_payments pay ON pay.registration_id=r.id
              WHERE ${conditions.join(" AND ")}
              ORDER BY r.id DESC`,
            params
        );
        return Response.json({ ok: true, requests: rows });
    } catch (error) {
        if (error?.code === "ER_NO_SUCH_TABLE") {
            return Response.json({ error: "Falta ejecutar la migración de inscripciones de Tags Events" }, { status: 409 });
        }
        console.error("EVENT REGISTRATION REQUEST LIST ERROR", error);
        return Response.json({ error: "No se pudieron cargar las solicitudes" }, { status: 500 });
    }
}

export async function PATCH(request) {
    const body = await request.json().catch(() => null);
    const eventId = Number(body?.eventId || 0);
    const registrationId = Number(body?.registrationId || 0);
    const action = String(body?.action || "");
    const access = await requireEventAccess({ eventId, permission: "attendees.update" });
    if (!access.ok) return eventAccessError(access);
    if (access.isStaff && access.session?.type !== "business_staff") return eventAccessError({ status: 403, error: "Solo el responsable del evento puede resolver solicitudes" });
    if (!registrationId || !["confirm", "reject", "approve_payment", "reject_payment"].includes(action)) {
        return Response.json({ error: "Acción inválida" }, { status: 400 });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [[registration]] = await connection.query(
            `SELECT r.id,r.attendee_id,a.status,a.name,a.email,a.phone,e.name AS event_name,b.logo_url AS business_logo_url,
                    pay.id AS payment_id,pay.provider AS payment_provider,pay.status AS payment_status,
                    COALESCE(ps.payment_mode,'free') AS payment_mode,s.confirmation_mode
               FROM tags_event_registrations r
               INNER JOIN tags_event_attendees a ON a.id=r.attendee_id
               INNER JOIN tags_events e ON e.id=r.event_id
               INNER JOIN tags_businesses b ON b.id=e.business_id
               INNER JOIN tags_event_registration_settings s ON s.event_id=r.event_id
               LEFT JOIN tags_event_payment_settings ps ON ps.event_id=r.event_id
               LEFT JOIN tags_event_registration_payments pay ON pay.registration_id=r.id
              WHERE r.id=? AND r.event_id=?
              LIMIT 1 FOR UPDATE`,
            [registrationId, eventId]
        );
        if (!registration) {
            await connection.rollback();
            return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });
        }
        if (["confirm", "reject"].includes(action) && registration.status !== "pending") {
            await connection.rollback();
            return Response.json({ error: "La solicitud ya fue resuelta" }, { status: 409 });
        }

        let credential = null;
        if (action === "confirm") {
            if (registration.payment_mode !== "free" && registration.payment_status !== "approved") {
                await connection.rollback();
                return Response.json({ error: "Primero debés aprobar el pago" }, { status: 409 });
            }
            const [confirmationUpdate] = await connection.query(
                `UPDATE tags_event_attendees SET status='confirmed',confirmed_at=NOW(),declined_at=NULL,updated_at=NOW() WHERE id=?`,
                [registration.attendee_id]
            );
            if (Number(confirmationUpdate.affectedRows) !== 1) throw new Error("EVENT_CONFIRMATION_NOT_PERSISTED");
            credential = await ensureEventAttendeeCredential({
                connection,
                attendeeId: registration.attendee_id,
                baseUrl: getRequestBaseUrl(request)
            });
        } else if (action === "reject") {
            if (registration.payment_provider === "mercadopago" && registration.provider_status && !["rejected", "cancelled", "create_failed"].includes(registration.provider_status)) {
                await connection.rollback();
                return Response.json({ error: "No se puede rechazar mientras Mercado Pago está procesando el cobro" }, { status: 409 });
            }
            await connection.query(
                `UPDATE tags_event_attendees SET status='declined',declined_at=NOW(),confirmed_at=NULL,updated_at=NOW() WHERE id=?`,
                [registration.attendee_id]
            );
            if (registration.payment_id) {
                await connection.query(
                    `UPDATE tags_event_registration_payments SET status='cancelled',updated_at=NOW() WHERE id=? AND status<>'approved'`,
                    [registration.payment_id]
                );
            }
        } else if (action === "approve_payment") {
            if (registration.payment_provider !== "manual") {
                await connection.rollback();
                return Response.json({ error: "Los pagos de Mercado Pago se acreditan automáticamente" }, { status: 409 });
            }
            if (!registration.payment_id || !["pending", "submitted", "rejected"].includes(registration.payment_status)) {
                await connection.rollback();
                return Response.json({ error: "El pago no puede aprobarse en su estado actual" }, { status: 409 });
            }
            await connection.query(
                `UPDATE tags_event_registration_payments
                    SET status='approved',review_notes=?,reviewed_at=NOW(),reviewed_by_id=?,updated_at=NOW()
                  WHERE id=?`,
                [String(body?.reviewNotes || "").trim() || null, access.session?.userId || access.businessId || null, registration.payment_id]
            );
            if (registration.confirmation_mode === "automatic" && registration.status === "pending") {
                await connection.query(
                    `UPDATE tags_event_attendees SET status='confirmed',confirmed_at=NOW(),declined_at=NULL,updated_at=NOW() WHERE id=?`,
                    [registration.attendee_id]
                );
                credential = await ensureEventAttendeeCredential({ connection, attendeeId: registration.attendee_id, baseUrl: getRequestBaseUrl(request) });
            }
        } else if (action === "reject_payment") {
            if (registration.payment_provider !== "manual") {
                await connection.rollback();
                return Response.json({ error: "Los pagos de Mercado Pago se actualizan automáticamente" }, { status: 409 });
            }
            if (!registration.payment_id || registration.payment_status !== "submitted") {
                await connection.rollback();
                return Response.json({ error: "Solo se puede rechazar un comprobante en revisión" }, { status: 409 });
            }
            await connection.query(
                `UPDATE tags_event_registration_payments
                    SET status='rejected',review_notes=?,reviewed_at=NOW(),reviewed_by_id=?,updated_at=NOW()
                  WHERE id=?`,
                [String(body?.reviewNotes || "").trim() || "Comprobante rechazado", access.session?.userId || access.businessId || null, registration.payment_id]
            );
        }

        const [[resolvedAttendee]] = await connection.query("SELECT status,qr_token FROM tags_event_attendees WHERE id=? LIMIT 1", [registration.attendee_id]);
        await connection.commit();
        if (credential && ["confirm", "approve_payment"].includes(action) && body?.notifyClient !== false) {
            await sendEventConfirmationEmail({
                eventId,
                registrationId,
                attendeeId: registration.attendee_id,
                attendeeName: registration.name,
                email: registration.email,
                eventName: registration.event_name,
                credentialUrl: credential.qrUrl,
                logoUrl: registration.business_logo_url
            }).catch(error => console.error("EVENT CONFIRMATION EMAIL ERROR", error));
        }
        return Response.json({
            ok: true,
            status: ["confirm", "reject"].includes(action) ? resolvedAttendee?.status : action === "approve_payment" ? "approved" : "rejected",
            credentialUrl: credential ? `/e/access/${credential.qrToken}` : null
        });
    } catch (error) {
        await connection.rollback();
        console.error("EVENT REGISTRATION REQUEST ACTION ERROR", error);
        const messages = {
            EVENT_CONFIRMATION_NOT_PERSISTED: "La base de datos no guardó el estado confirmado",
            ATTENDEE_NOT_FOUND: "No se encontró el inscripto asociado"
        };
        return Response.json({ error: messages[error?.message] || "No se pudo generar la credencial de la inscripción" }, { status: 500 });
    } finally {
        connection.release();
    }
}
