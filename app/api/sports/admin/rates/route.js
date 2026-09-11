export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSportsAccess } from "@/app/modules/sports/lib/getSportsAccess";
import { turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { jsonResponseError, parseJson } from "@/app/modules/turnos/lib/turnosService";

const AUDIENCES = new Set(["guest", "member"]);
const MODES = new Set(["admin_only", "public_request", "public_auto_confirm", "members_only", "members_and_guests"]);

export async function PUT(req) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0);
    const turnosId = Number(body.turnosId || 0);
    const serviceId = Number(body.serviceId || 0);
    const access = await getSportsAccess({ businessId, turnosId, permission: "sports.rates.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const [services] = await db.query("SELECT id, settings_json FROM tags_turnos_services WHERE id = ? AND turnos_id = ? LIMIT 1", [serviceId, turnosId]);
    if (!services[0]) return jsonResponseError("Servicio no encontrado", 404);

    const mode = MODES.has(body.audienceMode) ? body.audienceMode : "members_and_guests";
    const bookingChannelMode = mode === "admin_only" ? "admin_only" : mode === "public_request" ? "public_request" : mode === "public_auto_confirm" ? "public_auto_confirm" : "hybrid";
    const confirmationMode = mode === "public_request" ? "manual" : "automatic";
    const identificationMode = mode === "members_only" ? "magic_link" : "contact";
    const settings = parseJson(services[0].settings_json);
    const minimumDurationMinutes = Math.max(30, Math.min(720, Math.floor(Number(body.minimumDurationMinutes || 60))));
    const durationIncrementMinutes = Math.max(15, Math.min(180, Math.floor(Number(body.durationIncrementMinutes || 30))));
    const maxDurationMinutes = Math.max(minimumDurationMinutes, Math.min(720, Math.floor(Number(body.maxDurationMinutes || minimumDurationMinutes))));
    settings.sports = {
        ...(settings.sports || {}),
        audienceMode: mode,
        minimumDurationMinutes,
        durationIncrementMinutes,
        maxDurationMinutes
    };
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query("UPDATE tags_turnos_services SET settings_json = ?, duration_minutes = ?, booking_channel_mode = ?, confirmation_mode = ?, customer_identification_mode = ?, updated_at = NOW() WHERE id = ? AND turnos_id = ?", [JSON.stringify(settings), minimumDurationMinutes, bookingChannelMode, confirmationMode, identificationMode, serviceId, turnosId]);
        for (const audience of ["guest", "member"]) {
            if (!AUDIENCES.has(audience)) continue;
            const price = Math.max(0, Number(body[`${audience}Price`] || 0));
            await connection.query(
                `INSERT INTO tags_sports_service_rates
                    (sports_app_id, service_id, audience_type, price, currency, is_active)
                 VALUES (?, ?, ?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE price = VALUES(price), currency = VALUES(currency), is_active = 1, updated_at = NOW()`,
                [access.sportsApp.id, serviceId, audience, price, String(body.currency || "ARS").slice(0, 10)]
            );
        }
        await connection.commit();
        return Response.json({ ok: true });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
