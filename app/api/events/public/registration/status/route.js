import { db } from "@/app/lib/tags-db";
import { hashRegistrationAccessToken } from "@/app/modules/e-events/lib/eventRegistration";
import { getEventDirectoryRoute } from "@/app/modules/e-events/lib/eventPublicRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    const token = String(new URL(request.url).searchParams.get("token") || "");
    if (token.length < 32) return Response.json({ error: "Inscripción no encontrada" }, { status: 404 });
    try {
        const [[row]] = await db.query(
            `SELECT r.id,r.created_at,r.event_id,a.name,a.email,a.status,a.qr_token,a.confirmed_at,a.declined_at,
                    e.name AS event_name,e.location,e.starts_at,e.ends_at,e.cover_image,
                    s.public_slug,s.success_message,b.name AS business_name,
                    COALESCE(ps.payment_mode,'free') AS payment_mode,ps.ticket_price,COALESCE(ps.currency,'ARS') AS currency,
                    ps.manual_payment_title,ps.manual_payment_instructions,ps.manual_payment_holder,
                    ps.manual_payment_alias,ps.manual_payment_cbu,
                    pay.id AS payment_id,pay.provider AS payment_provider,pay.status AS payment_status,
                    pay.amount AS payment_amount,pay.currency AS payment_currency,pay.provider_status,
                    pay.payment_url,pay.paid_at,
                    pay.proof_url,pay.proof_mime_type,pay.payer_reference,pay.attendee_notes,pay.review_notes
               FROM tags_event_registrations r
               INNER JOIN tags_event_attendees a ON a.id=r.attendee_id
               INNER JOIN tags_events e ON e.id=r.event_id
               INNER JOIN tags_event_registration_settings s ON s.event_id=e.id
               INNER JOIN tags_businesses b ON b.id=e.business_id
               LEFT JOIN tags_event_payment_settings ps ON ps.event_id=e.id
               LEFT JOIN tags_event_registration_payments pay ON pay.registration_id=r.id
              WHERE r.access_token_hash=?
              LIMIT 1`,
            [hashRegistrationAccessToken(token)]
        );
        if (!row) return Response.json({ error: "Inscripción no encontrada" }, { status: 404 });
        const directoryRoute = await getEventDirectoryRoute({ eventId: row.event_id, publicSlug: row.public_slug }).catch(() => null);
        return Response.json({
            ok: true,
            registration: {
                ...row,
                event_path: directoryRoute?.path || null,
                credential_url: row.qr_token ? `/e/access/${row.qr_token}` : null,
                qr_token: undefined
            }
        });
    } catch (error) {
        console.error("PUBLIC EVENT REGISTRATION STATUS ERROR", error);
        return Response.json({ error: "No se pudo consultar la inscripción" }, { status: 500 });
    }
}
