export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";
import { createGuestToken, getGuestVerificationUrl, hashGuestToken, parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";

function authorized(req) {
    const expected = process.env.SYSTEM_CRON_SECRET || "";
    const received = (req.headers.get("authorization") || req.headers.get("x-cron-secret") || "").replace(/^Bearer\s+/i, "").trim();
    return Boolean(expected && received === expected);
}
function date(value) { return String(value).slice(0, 10); }
function displayDate(value) { return new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }); }
function displayTime(value) { const [hour, minute] = String(value || "").split(":"); return hour ? `${Number(hour)}${minute && Number(minute) ? `:${String(minute).padStart(2, "0")}` : ""}hs` : "A confirmar"; }

async function runArrivalReminders(req) {
    if (!authorized(req)) return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
    const [rows] = await db.query(`
        SELECT s.*,a.name app_name,a.slug,a.logo_url,a.settings_json,g.name guest_name,g.email,
               (SELECT pc.status FROM tags_guest_precheckins pc WHERE pc.stay_id=s.id LIMIT 1) precheckin_status
          FROM tags_guest_stays s
          INNER JOIN tags_guest_apps a ON a.id=s.guest_app_id AND a.status='published'
          INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id
         WHERE s.status='reserved' AND s.starts_at>=NOW() AND s.starts_at<DATE_ADD(NOW(),INTERVAL 3 DAY)
           AND NOT EXISTS (SELECT 1 FROM tags_guest_communications c WHERE c.stay_id=s.id AND c.event_code='arrival_reminder' AND c.status='sent')
         ORDER BY s.starts_at LIMIT 200`);
    let sent = 0, failed = 0, skipped = 0;
    for (const stay of rows) {
        const settings = parseGuestJson(stay.settings_json);
        const [hour,minute] = String(settings.checkinTime || "15:00").split(":").map(Number);
        const arrival = new Date(`${date(stay.starts_at)}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00`);
        const remaining = arrival.getTime() - Date.now();
        if (remaining < 0 || remaining > 48 * 3600000) { skipped++; continue; }

        const token = createGuestToken(), connection = await db.getConnection();
        let tokenId;
        try {
            await connection.beginTransaction();
            const [result] = await connection.query("INSERT INTO tags_guest_access_tokens (guest_app_id,stay_id,guest_id,token_hash,channel,expires_at) VALUES (?,?,?,?, 'email',DATE_ADD(?,INTERVAL ? DAY))", [stay.guest_app_id,stay.id,stay.primary_guest_id,hashGuestToken(token),stay.ends_at,Math.max(1,Number(settings.sessionGraceDays||7))]);
            tokenId = result.insertId;
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            connection.release();
            failed++;
            continue;
        }
        connection.release();

        const link = await getGuestVerificationUrl(db, stay.slug, token);
        const subject = "¡Tenés un ingreso a nuestras cabañas!";
        const people = Number(stay.adults||0) + Number(stay.children||0);
        const period = `Ingreso: ${displayDate(stay.starts_at)} ${displayTime(settings.checkinTime || "15:00")}\nEgreso: ${displayDate(stay.ends_at)} ${displayTime(settings.checkoutTime || "10:00")}`;
        const precheckinDone = ["submitted","reviewed","checked_in"].includes(stay.precheckin_status);
        const precheckinHtml = precheckinDone ? "" : `<div style="margin:22px 0;padding:16px;border-radius:12px;background:#fff5e6;color:#75420d"><strong>Antes de viajar</strong><p style="margin:7px 0 0">Te invitamos a completar el pre-check-in desde Mi Estadía. Así, cuando llegues, tu ingreso será mucho más ágil.</p></div>`;
        const precheckinText = precheckinDone ? "" : " Te recomendamos completar el pre-check-in desde Mi Estadía antes de viajar.";
        const html = `<div style="max-width:620px;margin:auto;font-family:Arial,sans-serif;color:#183226;border:1px solid #dfe9e4;border-radius:18px;overflow:hidden"><div style="padding:24px;background:#f4f8f5;text-align:center">${stay.logo_url?`<img src="${stay.logo_url}" alt="${stay.app_name}" style="max-width:150px;max-height:90px">`:""}<h1>${subject}</h1></div><div style="padding:24px"><p>Hola <strong>${stay.guest_name}</strong>.</p><p>Tu reserva <strong>${stay.stay_code}</strong> es del ${period} para ${people} pasajero${people===1?"":"s"}.</p><p><strong>Horario de ingreso:</strong> ${settings.checkinTime||"A confirmar"}</p>${precheckinHtml}<p style="text-align:center;margin:28px 0"><a href="${link}" style="display:inline-block;padding:13px 20px;background:#22a35a;color:#fff;text-decoration:none;border-radius:9px;font-weight:bold">Acceder a Mi Estadía</a></p><p style="font-size:12px;color:#63746a">Este enlace no informa la unidad asignada y puede guardarse para volver a ingresar.</p></div></div>`;
        const delivery = await sendMail({ to: stay.email, subject, html, text: `${subject} Reserva ${stay.stay_code}, ${period}.${precheckinText} Acceso a Mi Estadía: ${link}` });
        const status = delivery.ok ? "sent" : "failed";
        await db.query("INSERT INTO tags_guest_communications (guest_app_id,stay_id,guest_id,access_token_id,event_code,direction,channel,recipient,subject,status,sent_at,failed_at,attempts,provider_reference,last_error,idempotency_key,created_by_type) VALUES (?,?,?,?,'arrival_reminder','outbound','email',?,?,?,IF(?='sent',NOW(),NULL),IF(?='failed',NOW(),NULL),1,?,?,?,'system')", [stay.guest_app_id,stay.id,stay.primary_guest_id,tokenId,stay.email,subject,status,status,status,delivery.result?.id||null,delivery.error||null,`arrival-reminder:${stay.id}:${date(stay.starts_at)}`]);
        if (delivery.ok) sent++; else failed++;
    }
    return Response.json({ ok: true, considered: rows.length, sent, failed, skipped });
}

export const GET = runArrivalReminders;
export const POST = runArrivalReminders;
