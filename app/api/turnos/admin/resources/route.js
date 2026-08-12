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
    const [rows] = await db.query(
        `SELECT r.*, rt.name AS resource_type_name, l.name AS location_name,
                (SELECT sr.service_id FROM tags_turnos_service_resources sr WHERE sr.resource_id=r.id AND sr.is_active=1 ORDER BY sr.service_id LIMIT 1) AS service_id,
                (SELECT s.name FROM tags_turnos_service_resources sr INNER JOIN tags_turnos_services s ON s.id=sr.service_id WHERE sr.resource_id=r.id AND sr.is_active=1 ORDER BY sr.service_id LIMIT 1) AS service_name
         FROM tags_turnos_resources r
         INNER JOIN tags_turnos_apps a ON a.id = r.turnos_id AND a.business_id = ? AND (? = 0 OR a.id = ?)
         INNER JOIN tags_turnos_resource_types rt ON rt.id = r.resource_type_id
         LEFT JOIN tags_turnos_locations l ON l.id = r.location_id
         WHERE r.is_active = 1
        ORDER BY r.sort_order ASC, r.id ASC`, [businessId, turnosId, turnosId]
    );
    return Response.json({ ok: true, resources: rows });
}

export async function POST(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const businessId = String(body?.businessId || "");
    const turnosId = Number(body?.turnosId || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "resources.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const name = cleanText(body?.name);
    const typeId = Number(body?.resourceTypeId || 0);
    const serviceId = Number(body?.serviceId || 0);
    if (!name || !typeId || !serviceId) return jsonResponseError("Servicio, nombre y tipo de recurso son requeridos");
    if (!turnosId) return jsonResponseError("turnosId es requerido");
    const [apps] = await db.query("SELECT id FROM tags_turnos_apps WHERE id = ? AND business_id = ? LIMIT 1", [turnosId, businessId]);
    if (!apps[0]) return jsonResponseError("Tags Turnos no encontrado", 404, "TURNOS_NOT_FOUND");
    const [types] = await db.query("SELECT id FROM tags_turnos_resource_types WHERE id = ? AND turnos_id = ? LIMIT 1", [typeId, apps[0].id]);
    if (!types[0]) return jsonResponseError("Tipo de recurso inválido", 400, "RESOURCE_TYPE_INVALID");
    const [services] = await db.query("SELECT s.id FROM tags_turnos_services s INNER JOIN tags_turnos_service_resource_requirements rr ON rr.service_id=s.id AND rr.resource_type_id=? WHERE s.id=? AND s.turnos_id=? AND s.is_active=1 LIMIT 1", [typeId, serviceId, apps[0].id]);
    if (!services[0]) return jsonResponseError("Servicio inválido", 400, "SERVICE_INVALID");
    const [result] = await db.query(
        `INSERT INTO tags_turnos_resources
         (turnos_id, resource_type_id, location_id, name, description, capacity, color, image_url,
          public_metadata_json, private_metadata_json, is_customer_selectable, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [apps[0].id, typeId, Number(body?.locationId || 0) || null, name, cleanText(body?.description, 500),
            Math.max(1, Number(body?.capacity || 1)), cleanText(body?.color, 30) || null,
            cleanText(body?.imageUrl, 500) || null, JSON.stringify({ ...(body?.publicMetadata || {}), allowConsecutiveBookings: body?.allowConsecutiveBookings === true, maxConsecutiveSlots: body?.allowConsecutiveBookings === true ? Math.max(2, Math.min(96, Number(body?.maxConsecutiveSlots || 2))) : 1 }),
            JSON.stringify(body?.privateMetadata || {}), body?.isCustomerSelectable === false ? 0 : 1,
            Number(body?.sortOrder || 0)]
    );
    await db.query("INSERT INTO tags_turnos_service_resources (service_id,resource_id,is_active) VALUES (?,?,1)", [serviceId, result.insertId]);
    return Response.json({ ok: true, resourceId: result.insertId }, { status: 201 });
}

export async function PUT(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const businessId = String(body?.businessId || "");
    const resourceId = Number(body?.resourceId || 0);
    const typeId = Number(body?.resourceTypeId || 0);
    const serviceId = Number(body?.serviceId || 0);
    const turnosId = Number(body?.turnosId || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "resources.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    if (!resourceId || !cleanText(body?.name) || !typeId || !serviceId) return jsonResponseError("Recurso, servicio, nombre y tipo son requeridos");
    const [types] = await db.query(`SELECT rt.id FROM tags_turnos_resource_types rt INNER JOIN tags_turnos_apps a ON a.id = rt.turnos_id AND a.business_id = ? WHERE rt.id = ? AND rt.is_active = 1 LIMIT 1`, [businessId, typeId]);
    if (!types.length) return jsonResponseError("Tipo de recurso inválido", 400, "RESOURCE_TYPE_INVALID");
    const [services] = await db.query("SELECT s.id FROM tags_turnos_services s INNER JOIN tags_turnos_apps a ON a.id=s.turnos_id AND a.business_id=? INNER JOIN tags_turnos_service_resource_requirements rr ON rr.service_id=s.id AND rr.resource_type_id=? WHERE s.id=? AND s.turnos_id=? AND s.is_active=1 LIMIT 1", [businessId, typeId, serviceId, turnosId]);
    if (!services.length) return jsonResponseError("Servicio inválido", 400, "SERVICE_INVALID");
    const [result] = await db.query(
        `UPDATE tags_turnos_resources r INNER JOIN tags_turnos_apps a ON a.id = r.turnos_id AND a.business_id = ? AND a.id = ?
         SET r.resource_type_id = ?, r.name = ?, r.description = ?, r.capacity = ?, r.is_customer_selectable = ?, r.public_metadata_json = ?
         WHERE r.id = ? AND r.is_active = 1`,
        [businessId, turnosId, typeId, cleanText(body.name), cleanText(body.description, 500), Math.max(1, Number(body.capacity || 1)), body.isCustomerSelectable === false ? 0 : 1, JSON.stringify({ ...(body?.publicMetadata || {}), allowConsecutiveBookings: body?.allowConsecutiveBookings === true, maxConsecutiveSlots: body?.allowConsecutiveBookings === true ? Math.max(2, Math.min(96, Number(body?.maxConsecutiveSlots || 2))) : 1 }), resourceId]
    );
    if (!result.affectedRows) return jsonResponseError("Recurso no encontrado", 404);
    await db.query("UPDATE tags_turnos_service_resources SET is_active=0 WHERE resource_id=?", [resourceId]);
    await db.query("INSERT INTO tags_turnos_service_resources (service_id,resource_id,is_active) VALUES (?,?,1) ON DUPLICATE KEY UPDATE is_active=1", [serviceId, resourceId]);
    return Response.json({ ok: true });
}

export async function DELETE(req) {
    const body = await req.json().catch(() => ({}));
    const businessId = String(body?.businessId || new URL(req.url).searchParams.get("businessId") || "");
    const resourceId = Number(body?.resourceId || new URL(req.url).searchParams.get("resourceId") || 0);
    const turnosId = Number(body?.turnosId || new URL(req.url).searchParams.get("turnosId") || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "resources.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const [owned] = await db.query("SELECT r.id FROM tags_turnos_resources r INNER JOIN tags_turnos_apps a ON a.id=r.turnos_id AND a.business_id=? WHERE r.id=? AND r.turnos_id=? LIMIT 1", [businessId, resourceId, turnosId]);
    if (!owned.length) return jsonResponseError("Recurso no encontrado", 404);
    const [history] = await db.query("SELECT 1 FROM tags_turnos_booking_resources WHERE resource_id=? LIMIT 1", [resourceId]);
    await db.query("DELETE FROM tags_turnos_service_resources WHERE resource_id=?", [resourceId]);
    if (history.length) await db.query("UPDATE tags_turnos_resources SET is_active=0 WHERE id=?", [resourceId]);
    else {
        await db.query("DELETE FROM tags_turnos_schedule_rules WHERE turnos_id=? AND scope_type='resource' AND scope_id=?", [turnosId, resourceId]);
        await db.query("DELETE FROM tags_turnos_schedule_exceptions WHERE turnos_id=? AND scope_type='resource' AND scope_id=?", [turnosId, resourceId]);
        await db.query("DELETE FROM tags_turnos_resources WHERE id=?", [resourceId]);
    }
    return Response.json({ ok: true, deletion: history.length ? "archived" : "deleted" });
}
