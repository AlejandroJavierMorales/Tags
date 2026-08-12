export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosAccess, turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { cleanText, jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const businessId = new URL(req.url).searchParams.get("businessId");
    const turnosId = Number(new URL(req.url).searchParams.get("turnosId") || 0);
    if (!businessId) return jsonResponseError("businessId es requerido");
    const access = await getTurnosAccess({ businessId, turnosId, permission: "resources.view" });
    if (!access.allowed) return turnosAccessResponse(access);
    const [rows] = await db.query(`SELECT rt.* FROM tags_turnos_resource_types rt INNER JOIN tags_turnos_apps a ON a.id = rt.turnos_id AND a.business_id = ? AND (? = 0 OR a.id = ?) WHERE rt.is_active = 1 ORDER BY rt.name`, [businessId, turnosId, turnosId]);
    return Response.json({ ok: true, resourceTypes: rows });
}

export async function POST(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const businessId = String(body?.businessId || "");
    const turnosId = Number(body?.turnosId || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "resources.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const code = cleanText(body?.code, 80).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const name = cleanText(body?.name, 120);
    if (!code || !name) return jsonResponseError("code y name son requeridos");
    if (!turnosId) return jsonResponseError("turnosId es requerido");
    const [apps] = await db.query("SELECT id FROM tags_turnos_apps WHERE id = ? AND business_id = ? LIMIT 1", [turnosId, businessId]);
    if (!apps[0]) return jsonResponseError("Tags Turnos no encontrado", 404, "TURNOS_NOT_FOUND");
    const [result] = await db.query("INSERT INTO tags_turnos_resource_types (turnos_id, code, name, singular_label, plural_label) VALUES (?, ?, ?, ?, ?)", [apps[0].id, code, name, body?.singularLabel || name, body?.pluralLabel || name]);
    return Response.json({ ok: true, resourceTypeId: result.insertId }, { status: 201 });
}
