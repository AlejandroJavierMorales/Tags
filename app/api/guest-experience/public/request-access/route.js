export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";
import { createGuestToken, hashGuestToken, parseGuestJson, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

const genericMessage = "Si los datos coinciden con una reserva, recibirás un nuevo enlace de acceso.";
function digits(value) { return String(value || "").replace(/\D/g, ""); }
function phoneKey(value) { let phone = digits(value); if (phone.startsWith("00")) phone = phone.slice(2); if (phone.startsWith("549")) phone = phone.slice(3); else if (phone.startsWith("54")) phone = phone.slice(2); return phone.replace(/^0/, "").replace(/^15/, ""); }
function whatsapp(value) { let phone = digits(value); if (phone.startsWith("00")) phone = phone.slice(2); if (phone.startsWith("54")) return phone.startsWith("549") ? phone : `549${phone.slice(2).replace(/^15/, "")}`; phone = phone.replace(/^0/, "").replace(/^15/, ""); return phone ? `549${phone}` : ""; }
function displayDate(value) { return value ? new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }) : ""; }
function baseUrl() { return process.env.NODE_ENV === "development" ? "http://localhost:3000" : process.env.NEXT_PUBLIC_BASE_URL_PROD || process.env.NEXT_PUBLIC_APP_URL; }

export async function POST(req) {
    try {
        const body = await req.json().catch(() => null);
        const slug = String(body?.slug || "").trim();
        const stayCode = String(body?.stayCode || "").trim();
        const identifier = String(body?.identifier || "").trim().toLowerCase();
        if (!slug || !stayCode || !identifier) return guestError("Completá código de reserva y email o WhatsApp", 400);
        const [rows] = await db.query(`SELECT s.id stay_id,s.guest_app_id,s.primary_guest_id,s.stay_code,s.starts_at,s.ends_at,s.status stay_status,a.slug,a.name app_name,a.logo_url,a.settings_json,g.name guest_name,g.email guest_email,g.phone guest_phone FROM tags_guest_stays s INNER JOIN tags_guest_apps a ON a.id=s.guest_app_id AND a.slug=? AND a.status='published' INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id WHERE s.stay_code=? LIMIT 1`, [slug, stayCode]);
        const stay = rows[0];
        const emailMatches = stay?.guest_email && String(stay.guest_email).trim().toLowerCase() === identifier;
        const phoneMatches = stay?.guest_phone && phoneKey(stay.guest_phone) === phoneKey(identifier) && phoneKey(identifier).length >= 8;
        if (!stay || (!emailMatches && !phoneMatches) || ["cancelled", "checked_out"].includes(stay.stay_status)) return Response.json({ ok: true, message: genericMessage });
        const settings = parseGuestJson(stay.settings_json);
        const graceDays = Math.max(1, Math.min(60, Number(settings.sessionGraceDays || 7)));
        const token = createGuestToken();
        const connection = await db.getConnection();
        let tokenId;
        try {
            await connection.beginTransaction();
            await connection.query("UPDATE tags_guest_access_tokens SET revoked_at=NOW() WHERE stay_id=? AND revoked_at IS NULL", [stay.stay_id]);
            const [result] = await connection.query("INSERT INTO tags_guest_access_tokens (guest_app_id,stay_id,guest_id,token_hash,channel,expires_at) VALUES (?,?,?,?,?,DATE_ADD(?,INTERVAL ? DAY))", [stay.guest_app_id, stay.stay_id, stay.primary_guest_id, hashGuestToken(token), emailMatches ? "email" : "whatsapp", stay.ends_at, graceDays]);
            tokenId = result.insertId;
            await connection.commit();
        } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
        const link = `${baseUrl()}/api/guest-experience/public/session/verify?slug=${encodeURIComponent(stay.slug)}&token=${token}`;
        const title = `Tu nuevo acceso a Mi Estadía en ${stay.app_name}`;
        const schedule = `${displayDate(stay.starts_at)} al ${displayDate(stay.ends_at)}`;
        const text = `${title}\nReserva ${stay.stay_code}\n${schedule}\nAcceder: ${link}`;
        const whatsappNumber = whatsapp(stay.guest_phone);
        const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}` : null;
        let emailSent = false;
        if (emailMatches && stay.guest_email) {
            const delivery = await sendMail({ to: stay.guest_email, subject: title, text, html: `<div style="max-width:620px;margin:auto;font-family:Arial,sans-serif;color:#183226"><div style="padding:24px;background:#f4f8f5;text-align:center">${stay.logo_url ? `<img src="${stay.logo_url}" alt="${stay.app_name}" style="max-width:190px;max-height:90px">` : ""}<h1>${title}</h1></div><div style="padding:24px"><p>Hola <strong>${stay.guest_name}</strong>,</p><p>Generamos un nuevo acceso para tu reserva <strong>${stay.stay_code}</strong>, del ${schedule}.</p><p style="text-align:center;margin:26px 0"><a href="${link}" style="display:inline-block;padding:13px 20px;background:#27754b;color:#fff;text-decoration:none;border-radius:9px;font-weight:bold">Acceder a Mi Estadía</a></p></div></div>` });
            emailSent = Boolean(delivery.ok);
        }
        await db.query("INSERT INTO tags_guest_communications (guest_app_id,stay_id,guest_id,access_token_id,event_code,direction,channel,recipient,subject,message_text,status,sent_at,attempts,created_by_type) VALUES (?,?,?,?,'access_requested','outbound',?,?,?,?,?,?,1,'guest')", [stay.guest_app_id, stay.stay_id, stay.primary_guest_id, tokenId, emailSent ? "email" : "whatsapp", emailSent ? stay.guest_email : stay.guest_phone, title, text, emailSent ? "sent" : "generated", emailSent ? new Date() : null]);
        return Response.json({ ok: true, message: emailSent ? "Te enviamos un nuevo enlace por email." : "Generamos un nuevo enlace. Podés enviártelo por WhatsApp.", whatsappUrl: emailSent ? null : whatsappUrl });
    } catch (error) {
        console.error("GUEST REQUEST ACCESS ERROR", error);
        return guestError("No se pudo procesar la solicitud", 500);
    }
}
