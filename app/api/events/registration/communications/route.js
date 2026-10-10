import { db } from "@/app/lib/tags-db";
import { eventAccessError, requireEventAccess } from "@/app/modules/e-events/lib/eventApiAccess";
import { logEventCommunication, sendEventConfirmationEmail, whatsappConfirmationUrl } from "@/app/modules/e-events/lib/eventRegistrationCommunications";
import { eventCredentialBaseUrl } from "@/app/modules/e-events/lib/ensureEventAttendeeCredential";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    const url = new URL(request.url), eventId = Number(url.searchParams.get("eventId") || 0), registrationId = Number(url.searchParams.get("registrationId") || 0);
    const access = await requireEventAccess({ eventId, permission: "attendees.view" });
    if (!access.ok) return eventAccessError(access);
    try {
        const [rows] = await db.query("SELECT id,channel,communication_type,recipient,delivery_status,error_message,created_at FROM tags_event_registration_communications WHERE event_id=? AND registration_id=? ORDER BY id DESC", [eventId, registrationId]);
        return Response.json({ ok: true, communications: rows });
    } catch (error) {
        return Response.json({ error: error?.code === "ER_NO_SUCH_TABLE" ? "Falta ejecutar la migración del historial de comunicaciones" : "No se pudo cargar el historial" }, { status: 409 });
    }
}

export async function POST(request) {
    const body = await request.json().catch(() => null), eventId = Number(body?.eventId || 0), registrationId = Number(body?.registrationId || 0);
    const access = await requireEventAccess({ eventId, permission: "attendees.update" });
    if (!access.ok) return eventAccessError(access);
    const channel = body?.channel === "email" ? "email" : "whatsapp";
    const [[row]] = await db.query(`SELECT r.id registration_id,a.id attendee_id,a.name,a.email,a.phone,a.status,a.qr_token,e.name event_name,e.starts_at,e.location,e.address,b.logo_url business_logo_url,
        (SELECT s.primary_host FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published' INNER JOIN tags_directory_sites s ON s.id=sl.site_id AND s.is_active=1 WHERE l.business_id=e.business_id AND l.status='published' ORDER BY (s.code='calamuchitar') DESC,s.id LIMIT 1) AS directory_host
        FROM tags_event_registrations r INNER JOIN tags_event_attendees a ON a.id=r.attendee_id INNER JOIN tags_events e ON e.id=r.event_id INNER JOIN tags_businesses b ON b.id=e.business_id WHERE r.id=? AND r.event_id=? LIMIT 1`, [registrationId, eventId]);
    if (!row || row.status !== "confirmed" || !row.qr_token) return Response.json({ error: "La inscripción debe estar confirmada" }, { status: 409 });
    const credentialUrl = `${eventCredentialBaseUrl(new URL(request.url).origin, row.directory_host)}/e/access/${row.qr_token}`;
    if (channel === "email") {
        if (!row.email) return Response.json({ error: "El inscripto no tiene un email válido" }, { status: 409 });
        const result = await sendEventConfirmationEmail({ eventId, registrationId, attendeeId: row.attendee_id, attendeeName: row.name, email: row.email, eventName: row.event_name, credentialUrl, logoUrl: row.business_logo_url });
        if (!result.ok) return Response.json({ error: result.error || "No se pudo enviar el email" }, { status: 502 });
        return Response.json({ ok: true, channel: "email" });
    }
    const whatsapp = whatsappConfirmationUrl({ phone: row.phone, attendeeName: row.name, eventName: row.event_name, credentialUrl, startsAt: row.starts_at, location: row.location, address: row.address });
    if (!whatsapp.url) return Response.json({ error: "El inscripto no tiene un WhatsApp válido" }, { status: 409 });
    await logEventCommunication({ eventId, registrationId, attendeeId: row.attendee_id, channel: "whatsapp", recipient: whatsapp.recipient, message: whatsapp.message, status: "prepared", createdByType: access.session?.type || access.session?.role, createdById: access.session?.userId || access.session?.staffId || access.businessId || null });
    return Response.json({ ok: true, whatsappUrl: whatsapp.url });
}
