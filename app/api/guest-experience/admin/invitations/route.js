export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { createGuestToken, getGuestVerificationUrl, hashGuestToken, guestError, parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { normalizeArgentinaWhatsapp } from "@/app/modules/qr-page/lib/normalizeContactFields";

const displayDate = value => new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
const displayTime = value => { const [hour, minute] = String(value || "").split(":"); return hour ? `${Number(hour)}${minute && Number(minute) ? `:${String(minute).padStart(2, "0")}` : ""}hs` : "A confirmar"; };

export async function POST(req) {
    const body = await req.json().catch(() => null);
    if (!body) return guestError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0), stayId = Number(body.stayId || 0);
    const eventCode = body.eventCode === "arrival_reminder" ? "arrival_reminder" : "access_link";
    const access = await getGuestAdminAccess({ businessId, guestAppId });
    if (!access.allowed) return guestAdminAccessResponse(access);
    const [rows] = await db.query(`SELECT s.id,s.primary_guest_id,s.stay_code,s.starts_at,s.ends_at,s.adults,s.children,s.expected_arrival_text,a.slug,a.name app_name,a.logo_url,a.settings_json,g.name guest_name,g.email,g.phone FROM tags_guest_stays s INNER JOIN tags_guest_apps a ON a.id=s.guest_app_id AND a.business_id=? INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id WHERE s.id=? AND s.guest_app_id=? LIMIT 1`, [businessId, stayId, guestAppId]);
    const stay = rows[0];
    if (!stay) return guestError("Reserva no encontrada", 404);
    const settings = parseGuestJson(stay.settings_json), grace = Math.max(1, Number(settings.sessionGraceDays || 7));
    const token = createGuestToken();
    const channel = body.channel === "whatsapp" ? "whatsapp" : body.channel === "email" ? "email" : "manual";
    const connection = await db.getConnection();
    let tokenId;
    try {
        await connection.beginTransaction();
        await connection.query("UPDATE tags_guest_access_tokens SET revoked_at=NOW() WHERE stay_id=? AND revoked_at IS NULL", [stayId]);
        const [result] = await connection.query("INSERT INTO tags_guest_access_tokens (guest_app_id,stay_id,guest_id,token_hash,channel,expires_at) VALUES (?,?,?,?,?,DATE_ADD(?,INTERVAL ? DAY))", [guestAppId, stayId, stay.primary_guest_id, hashGuestToken(token), channel, stay.ends_at, grace]);
        tokenId = result.insertId;
        await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }

    const link = await getGuestVerificationUrl(db, stay.slug, token);
    const title = eventCode === "arrival_reminder" ? "Tu ingreso a Mi Estadía" : `Acceso a Mi Estadía en ${stay.app_name}`;
    const checkinLabel = `${displayDate(stay.starts_at)} ${displayTime(settings.checkinTime || "15:00")}`;
    const checkoutLabel = `${displayDate(stay.ends_at)} ${displayTime(settings.checkoutTime || "10:00")}`;
    const people = Number(stay.adults || 0) + Number(stay.children || 0);
    const whatsappText = `🏡 *Mi Estadía*\n\n*${title}*\n\n📌 *Reserva:* ${stay.stay_code}\n👥 *Huéspedes:* ${people}\n\n🟢 *Ingreso:* ${checkinLabel}\n🔴 *Egreso:* ${checkoutLabel}\n\n🔗 *Enlace de acceso:*\n${link}\n\nTe esperamos.`;
    const html = `<div style="max-width:620px;margin:auto;font-family:Arial,sans-serif;color:#183226;border:1px solid #dfe9e4;border-radius:18px;overflow:hidden"><div style="padding:24px;background:#f4f8f5;text-align:center">${stay.logo_url ? `<img src="${stay.logo_url}" alt="${stay.app_name}" style="max-width:150px;max-height:90px">` : ""}<h1>${title}</h1></div><div style="padding:24px"><p>Hola <strong>${stay.guest_name}</strong>.</p><p>Estos son los datos de tu reserva <strong>${stay.stay_code}</strong>:</p><p><strong>Ingreso:</strong> ${checkinLabel}<br><strong>Egreso:</strong> ${checkoutLabel}<br><strong>Huéspedes:</strong> ${people}</p><p style="text-align:center;margin:28px 0"><a href="${link}" style="display:inline-block;padding:13px 20px;background:#22a35a;color:#fff;text-decoration:none;border-radius:9px;font-weight:bold">Acceder a Mi Estadía</a></p><p style="font-size:12px;color:#63746a">Este enlace puede utilizarse durante la estadía y el período de gracia configurado.</p></div></div>`;
    let status = "prepared", sentAt = null, lastError = null, providerReference = null, emailSent = false;
    if (channel === "email") {
        const delivery = await sendMail({ to: stay.email, subject: title, html, text: whatsappText });
        emailSent = delivery.ok; status = delivery.ok ? "sent" : "failed"; sentAt = delivery.ok ? new Date() : null; lastError = delivery.ok ? null : delivery.error; providerReference = delivery.result?.id || delivery.result?.message || null;
    } else if (channel === "manual") status = "generated";
    const phone = normalizeArgentinaWhatsapp(stay.phone);
    const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappText)}` : null;
    await db.query("INSERT INTO tags_guest_communications (guest_app_id,stay_id,guest_id,access_token_id,event_code,direction,channel,recipient,subject,message_text,status,sent_at,failed_at,attempts,provider_reference,last_error,created_by_type,created_by_id) VALUES (?,?,?,? ,?,'outbound',?,?,?,?,?,?,?,1,?,?, 'owner',?)", [guestAppId, stayId, stay.primary_guest_id, tokenId, eventCode, channel, channel === "email" ? stay.email : stay.phone, title, whatsappText, status, sentAt, status === "failed" ? new Date() : null, providerReference, lastError, access.session?.id || access.session?.userId || null]);
    if (channel === "email" && !emailSent) return Response.json({ ok: false, error: "El enlace fue generado pero no se pudo enviar el email", link }, { status: 502 });
    return Response.json({ ok: true, link, emailSent, whatsappUrl, status });
}
