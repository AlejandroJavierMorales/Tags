export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError, parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function PATCH(req) {
    const body = await req.json().catch(() => null);
    if (!body) return guestError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0);
    const access = await getGuestAdminAccess({ businessId, guestAppId });
    if (!access.allowed) return guestAdminAccessResponse(access);
    const name = cleanGuestText(body.name, 190), welcome = cleanGuestText(body.welcomeMessage, 500);
    if (!name) return guestError("El nombre es requerido");
    const codeBase = cleanGuestText(body.reservationCodeBase, 50);
    const codeMatch = codeBase?.match(/^(.*?)(\d+)$/);
    if (!codeMatch || !codeMatch[1]) return guestError("La base del código debe terminar en números, por ejemplo Temp26-27:E000");
    let themeId = null, themeCode = "tags_default", themeOverride = body.themeOverride === true;
    if (themeOverride) {
        const [themes] = await db.query("SELECT id,code FROM tags_qr_page_themes WHERE id=? AND is_active=1 LIMIT 1", [Number(body.themeId || 0)]);
        if (!themes[0]) return guestError("Theme no encontrado", 404);
        themeId = themes[0].id; themeCode = themes[0].code;
    } else {
        const [themes] = await db.query("SELECT t.id,t.code FROM tags_portals p INNER JOIN tags_qr_page_themes t ON t.code=p.theme_code AND t.is_active=1 WHERE p.business_id=? LIMIT 1", [businessId]);
        const [defaults] = themes.length ? [[]] : await db.query("SELECT id,code FROM tags_qr_page_themes WHERE code='tags_default' AND is_active=1 LIMIT 1");
        const theme = themes[0] || defaults[0]; themeId = theme?.id || null; themeCode = theme?.code || "tags_default";
    }
    const [apps] = await db.query("SELECT settings_json FROM tags_guest_apps WHERE id=? AND business_id=? LIMIT 1", [guestAppId, businessId]);
    const previous = parseGuestJson(apps[0]?.settings_json);
    const baseChanged = previous.reservationCodeBase !== codeBase;
    const depositPercentage = Math.max(0, Math.min(100, Number(body.depositPercentage || 0)));
    const occupancyFixedPeriod = body.occupancyFixedPeriod === true, occupancyStartDate = cleanGuestText(body.occupancyStartDate, 10), occupancyDays = Math.min(120, Math.max(7, Number(body.occupancyDays || 30)));
    if (occupancyFixedPeriod && !/^\d{4}-\d{2}-\d{2}$/.test(occupancyStartDate || "")) return guestError("Definí una fecha válida para el inicio de la grilla");
    const settings = { ...previous, themeId, themeCode, themeOverride, reservationCodeBase: codeBase, reservationCodePrefix: codeMatch[1], reservationCodePadding: codeMatch[2].length, reservationCodeCounter: baseChanged ? Number(codeMatch[2]) : Number(previous.reservationCodeCounter ?? codeMatch[2]), checkinTime: cleanGuestText(body.checkinTime, 20) || "15:00", checkoutTime: cleanGuestText(body.checkoutTime, 20) || "10:00", depositPercentage, occupancyFixedPeriod, occupancyStartDate: occupancyStartDate || "", occupancyDays, reminderHoursBefore: 48, receptionPhone: cleanGuestText(body.receptionPhone, 60) || "", receptionEmail: cleanGuestText(body.receptionEmail, 190) || "", arrivalInstructions: cleanGuestText(body.arrivalInstructions, 2000) || "", departureInstructions: cleanGuestText(body.departureInstructions, 2000) || "", houseRules: cleanGuestText(body.houseRules, 4000) || "" };
    await db.query("UPDATE tags_guest_apps SET name=?,logo_url=?,cover_url=?,welcome_message=?,settings_json=?,updated_at=NOW() WHERE id=? AND business_id=?", [name, cleanGuestText(body.logoUrl, 2000) || null, cleanGuestText(body.coverUrl, 2000) || null, welcome || null, JSON.stringify(settings), guestAppId, businessId]);
    return Response.json({ ok: true });
}
