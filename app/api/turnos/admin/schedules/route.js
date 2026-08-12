export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosAccess, turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const businessId = new URL(req.url).searchParams.get("businessId");
    const turnosId = Number(new URL(req.url).searchParams.get("turnosId") || 0);
    if (!businessId) return jsonResponseError("businessId es requerido");
    const access = await getTurnosAccess({ businessId, turnosId, permission: "availability.view" });
    if (!access.allowed) return turnosAccessResponse(access);
    const [rows] = await db.query(`SELECT r.* FROM tags_turnos_schedule_rules r INNER JOIN tags_turnos_apps a ON a.id = r.turnos_id AND a.business_id = ? AND (? = 0 OR a.id = ?) WHERE r.is_active = 1 ORDER BY CASE WHEN r.weekday = 0 THEN 7 ELSE r.weekday END ASC, r.start_time ASC, r.end_time ASC, r.id ASC`, [businessId, turnosId, turnosId]);
    return Response.json({ ok: true, schedules: rows });
}

export async function POST(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const businessId = String(body?.businessId || "");
    const turnosId = Number(body?.turnosId || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "availability.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const weekday = Number(body?.weekday);
    const startTime = String(body?.startTime || "");
    const endTime = String(body?.endTime || "");
    if (weekday < 0 || weekday > 6 || !/^\d{2}:\d{2}(:\d{2})?$/.test(startTime) || !/^\d{2}:\d{2}(:\d{2})?$/.test(endTime)) return jsonResponseError("weekday, startTime y endTime son inválidos");
    if (!turnosId) return jsonResponseError("turnosId es requerido");
    const [apps] = await db.query("SELECT id FROM tags_turnos_apps WHERE id = ? AND business_id = ? LIMIT 1", [turnosId, businessId]);
    if (!apps[0]) return jsonResponseError("Tags Turnos no encontrado", 404, "TURNOS_NOT_FOUND");
    const scopeType = ["app", "location", "resource"].includes(body?.scopeType) ? body.scopeType : "app";
    const scopeId = scopeType === "app" ? apps[0].id : Number(body?.scopeId || 0);
    if (scopeType === "resource") {
        const [resources] = await db.query("SELECT id FROM tags_turnos_resources WHERE id = ? AND turnos_id = ? AND is_active = 1 LIMIT 1", [scopeId, turnosId]);
        if (!resources[0]) return jsonResponseError("Recurso inválido para este turnero");
    }
    const [result] = await db.query(`INSERT INTO tags_turnos_schedule_rules (turnos_id, scope_type, scope_id, weekday, start_time, end_time, valid_from, valid_until, slot_interval_minutes, capacity_override) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [apps[0].id, scopeType, scopeId, weekday, startTime, endTime, body?.validFrom || null, body?.validUntil || null, Math.max(5, Number(body?.slotIntervalMinutes || 30)), body?.capacityOverride == null ? null : Number(body.capacityOverride)]);
    return Response.json({ ok: true, scheduleId: result.insertId }, { status: 201 });
}

export async function PUT(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const businessId = String(body?.businessId || "");
    const scheduleId = Number(body?.scheduleId || 0);
    const turnosId = Number(body?.turnosId || 0);
    const weekday = Number(body?.weekday);
    const startTime = String(body?.startTime || "");
    const endTime = String(body?.endTime || "");
    const scopeType = ["app", "location", "resource"].includes(body?.scopeType) ? body.scopeType : "app";
    const scopeId = scopeType === "app" ? turnosId : Number(body?.scopeId || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "availability.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    if (!scheduleId || weekday < 0 || weekday > 6 || !/^\d{2}:\d{2}(:\d{2})?$/.test(startTime) || !/^\d{2}:\d{2}(:\d{2})?$/.test(endTime)) return jsonResponseError("scheduleId, weekday, startTime y endTime son inválidos");
    if (scopeType === "resource") {
        const [resources] = await db.query("SELECT id FROM tags_turnos_resources WHERE id = ? AND turnos_id = ? AND is_active = 1 LIMIT 1", [scopeId, turnosId]);
        if (!resources[0]) return jsonResponseError("Recurso inválido para este turnero");
    }
    const [existing] = await db.query(`SELECT r.id FROM tags_turnos_schedule_rules r INNER JOIN tags_turnos_apps a ON a.id=r.turnos_id AND a.business_id=? WHERE r.id=? AND r.turnos_id=? AND r.is_active=1 LIMIT 1`, [businessId, scheduleId, turnosId]);
    if (!existing.length) return jsonResponseError("Horario no encontrado", 404);
    await db.query(
        `UPDATE tags_turnos_schedule_rules r INNER JOIN tags_turnos_apps a ON a.id = r.turnos_id AND a.business_id = ? AND a.id = ?
         SET r.scope_type = ?, r.scope_id = ?, r.weekday = ?, r.start_time = ?, r.end_time = ?, r.slot_interval_minutes = ?, r.capacity_override = ?
         WHERE r.id = ? AND r.is_active = 1`,
        [businessId, turnosId, scopeType, scopeId, weekday, startTime, endTime, Math.max(5, Number(body?.slotIntervalMinutes || 30)), body?.capacityOverride == null ? null : Number(body.capacityOverride), scheduleId]
    );
    return Response.json({ ok: true });
}

export async function DELETE(req) {
    const body = await req.json().catch(() => ({}));
    const businessId = String(body?.businessId || new URL(req.url).searchParams.get("businessId") || "");
    const scheduleId = Number(body?.scheduleId || new URL(req.url).searchParams.get("scheduleId") || 0);
    const turnosId = Number(body?.turnosId || new URL(req.url).searchParams.get("turnosId") || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "availability.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const [result] = await db.query(`DELETE r FROM tags_turnos_schedule_rules r INNER JOIN tags_turnos_apps a ON a.id = r.turnos_id AND a.business_id = ? AND a.id = ? WHERE r.id = ?`, [businessId, turnosId, scheduleId]);
    if (!result.affectedRows) return jsonResponseError("Horario no encontrado", 404);
    return Response.json({ ok: true });
}
