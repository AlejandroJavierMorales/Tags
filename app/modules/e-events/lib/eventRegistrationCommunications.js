import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";

function digits(value) { return String(value || "").replace(/\D/g, ""); }
function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character])); }
function eventDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function confirmationMessage({ attendeeName, eventName, credentialUrl, startsAt, location, address }) {
    const details = [
        startsAt ? `📅 *Fecha y hora:* ${eventDate(startsAt)}` : "",
        location ? `📍 *Lugar:* ${location}` : "",
        address ? `🏠 *Domicilio:* ${address}` : ""
    ].filter(Boolean).join("\n");
    return [
        `¡Hola ${attendeeName}! 👋`,
        "",
        "✅ *Tu inscripción está confirmada*",
        `🎫 *Evento:* ${eventName}`,
        details,
        "",
        "Abrí tu credencial QR desde este enlace:",
        credentialUrl,
        "",
        "Presentala al momento de la acreditación."
    ].filter((line, index, values) => line !== "" || values[index - 1] !== "").join("\n").trim();
}

export async function logEventCommunication(data) {
    await db.query(
        `INSERT INTO tags_event_registration_communications
         (event_id,registration_id,attendee_id,channel,communication_type,recipient,message,delivery_status,error_message,created_by_type,created_by_id,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())`,
        [data.eventId, data.registrationId, data.attendeeId, data.channel, data.type || "confirmation", data.recipient, data.message || null, data.status || "prepared", data.error || null, data.createdByType || null, data.createdById || null]
    );
}

export async function sendEventConfirmationEmail({ eventId, registrationId, attendeeId, attendeeName, email, eventName, credentialUrl, logoUrl = "" }) {
    if (!email) return { ok: false, skipped: true };
    const message = confirmationMessage({ attendeeName, eventName, credentialUrl });
    const logo = logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="" style="max-width:180px;max-height:75px;margin-bottom:18px">` : "";
    const result = await sendMail({
        to: email,
        fromName: eventName,
        subject: `Inscripción confirmada · ${eventName}`,
        text: message,
        html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px">${logo}<h1 style="font-size:24px">Inscripción confirmada</h1><p>Hola ${escapeHtml(attendeeName)}, tu inscripción a <strong>${escapeHtml(eventName)}</strong> está confirmada.</p><p><a href="${escapeHtml(credentialUrl)}" style="display:inline-block;padding:12px 18px;border-radius:9px;background:#26734f;color:#fff;text-decoration:none;font-weight:bold">Ver mi credencial QR</a></p></div>`
    });
    await logEventCommunication({ eventId, registrationId, attendeeId, channel: "email", recipient: email, message, status: result.ok ? "sent" : "failed", error: result.ok ? null : result.error });
    return result;
}

export function whatsappConfirmationUrl({ phone, attendeeName, eventName, credentialUrl, startsAt, location, address }) {
    const recipient = digits(phone);
    const message = confirmationMessage({ attendeeName, eventName, credentialUrl, startsAt, location, address });
    return { recipient, message, url: recipient ? `https://wa.me/${recipient}?text=${encodeURIComponent(message)}` : "" };
}
