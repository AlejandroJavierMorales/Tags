export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSportsAccess } from "@/app/modules/sports/lib/getSportsAccess";
import { turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function POST(req) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0), turnosId = Number(body.turnosId || 0);
    const access = await getSportsAccess({ businessId, turnosId, permission: "resources.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const typeCode = ["court", "coach"].includes(body.typeCode) ? body.typeCode : "";
    const name = String(body.name || "").trim().slice(0, 190);
    const disciplineId = Number(body.disciplineId || 0);
    if (!typeCode || !name || !disciplineId) return jsonResponseError("Deporte, tipo y nombre son requeridos");
    const [[type], [discipline]] = await Promise.all([
        db.query("SELECT id FROM tags_turnos_resource_types WHERE turnos_id=? AND code=? AND is_active=1 LIMIT 1", [turnosId, typeCode]).then(([rows]) => rows),
        db.query("SELECT id FROM tags_sports_disciplines WHERE id=? AND sports_app_id=? AND is_active=1 LIMIT 1", [disciplineId, access.sportsApp.id]).then(([rows]) => rows)
    ]);
    if (!type || !discipline) return jsonResponseError("Configuración deportiva inválida", 400);
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [created] = await connection.query("INSERT INTO tags_turnos_resources (turnos_id,resource_type_id,name,capacity,is_customer_selectable,is_active) VALUES (?,?,?,1,1,1)", [turnosId, type.id, name]);
        await connection.query("INSERT INTO tags_sports_resource_disciplines (sports_app_id,discipline_id,resource_id) VALUES (?,?,?)", [access.sportsApp.id, disciplineId, created.insertId]);
        const [services] = await connection.query(
            `SELECT id, JSON_UNQUOTE(JSON_EXTRACT(settings_json,'$.sports.activityKind')) AS activity_kind,
                    JSON_EXTRACT(settings_json,'$.sports.disciplineId') AS discipline_id
             FROM tags_turnos_services WHERE turnos_id=? AND is_active=1`, [turnosId]
        );
        const compatible = services.filter(service => (!service.discipline_id || Number(service.discipline_id) === disciplineId) && (typeCode === "court" || service.activity_kind === "class"));
        for (const service of compatible) {
            await connection.query("INSERT INTO tags_turnos_service_resources (service_id,resource_id,is_active) VALUES (?,?,1) ON DUPLICATE KEY UPDATE is_active=1", [service.id, created.insertId]);
            await connection.query(
                `INSERT INTO tags_turnos_service_resource_requirements (service_id,resource_type_id,quantity_required,units_per_booking,selection_mode,is_required)
                 SELECT ?,?,1,1,?,1 WHERE NOT EXISTS (SELECT 1 FROM tags_turnos_service_resource_requirements WHERE service_id=? AND resource_type_id=?)`,
                [service.id, type.id, typeCode === "coach" ? "customer" : "automatic", service.id, type.id]
            );
        }
        await connection.commit();
        return Response.json({ ok: true, resourceId: created.insertId }, { status: 201 });
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function PUT(req) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0);
    const turnosId = Number(body.turnosId || 0);
    const resourceId = Number(body.resourceId || 0);
    const access = await getSportsAccess({ businessId, turnosId, permission: "resources.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const [resourceRows] = await db.query("SELECT id FROM tags_turnos_resources WHERE id = ? AND turnos_id = ? LIMIT 1", [resourceId, turnosId]);
    if (!resourceRows[0]) return jsonResponseError("Cancha o recurso no encontrado", 404);

    const disciplineIds = [...new Set((Array.isArray(body.disciplineIds) ? body.disciplineIds : []).map(Number).filter(Boolean))];
    const serviceIds = [...new Set((Array.isArray(body.serviceIds) ? body.serviceIds : []).map(Number).filter(Boolean))];
    if (disciplineIds.length) {
        const placeholders = disciplineIds.map(() => "?").join(",");
        const [valid] = await db.query(
            `SELECT id FROM tags_sports_disciplines WHERE sports_app_id = ? AND id IN (${placeholders})`,
            [access.sportsApp.id, ...disciplineIds]
        );
        if (valid.length !== disciplineIds.length) return jsonResponseError("Una disciplina no pertenece a esta aplicación");
    }
    if (serviceIds.length) {
        const placeholders = serviceIds.map(() => "?").join(",");
        const [validServices] = await db.query(`SELECT id FROM tags_turnos_services WHERE turnos_id = ? AND is_active = 1 AND id IN (${placeholders})`, [turnosId, ...serviceIds]);
        if (validServices.length !== serviceIds.length) return jsonResponseError("Una actividad no pertenece a esta aplicación");
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        if (String(body.name || "").trim()) await connection.query("UPDATE tags_turnos_resources SET name=?,updated_at=NOW() WHERE id=? AND turnos_id=?", [String(body.name).trim().slice(0,190), resourceId, turnosId]);
        await connection.query("DELETE FROM tags_sports_resource_disciplines WHERE sports_app_id = ? AND resource_id = ?", [access.sportsApp.id, resourceId]);
        for (const disciplineId of disciplineIds) {
            await connection.query("INSERT INTO tags_sports_resource_disciplines (sports_app_id, discipline_id, resource_id) VALUES (?, ?, ?)", [access.sportsApp.id, disciplineId, resourceId]);
        }
        if (Array.isArray(body.serviceIds)) {
            await connection.query("UPDATE tags_turnos_service_resources SET is_active = 0 WHERE resource_id = ?", [resourceId]);
            for (const serviceId of serviceIds) {
                await connection.query("INSERT INTO tags_turnos_service_resources (service_id, resource_id, is_active) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE is_active = 1", [serviceId, resourceId]);
                await connection.query(
                    `INSERT INTO tags_turnos_service_resource_requirements (service_id, resource_type_id, quantity_required, units_per_booking, selection_mode, is_required)
                     SELECT ?, r.resource_type_id, 1, 1, 'customer', 1 FROM tags_turnos_resources r
                     WHERE r.id = ? AND NOT EXISTS (
                        SELECT 1 FROM tags_turnos_service_resource_requirements rr
                        WHERE rr.service_id = ? AND rr.resource_type_id = r.resource_type_id
                     )`,
                    [serviceId, resourceId, serviceId]
                );
            }
            await connection.query(
                `DELETE rr FROM tags_turnos_service_resource_requirements rr
                 WHERE rr.service_id IN (SELECT s.id FROM tags_turnos_services s WHERE s.turnos_id = ?)
                   AND NOT EXISTS (
                       SELECT 1 FROM tags_turnos_service_resources sr
                       INNER JOIN tags_turnos_resources r ON r.id = sr.resource_id
                       WHERE sr.service_id = rr.service_id AND sr.is_active = 1 AND r.resource_type_id = rr.resource_type_id
                   )`,
                [turnosId]
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

export async function DELETE(req) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0), turnosId = Number(body.turnosId || 0), resourceId = Number(body.resourceId || 0);
    const access = await getSportsAccess({ businessId, turnosId, permission: "resources.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const [history] = await db.query("SELECT 1 FROM tags_turnos_booking_resources br INNER JOIN tags_turnos_resources r ON r.id=br.resource_id WHERE r.id=? AND r.turnos_id=? LIMIT 1", [resourceId, turnosId]);
    if (history.length) await db.query("UPDATE tags_turnos_resources SET is_active=0,updated_at=NOW() WHERE id=? AND turnos_id=?", [resourceId, turnosId]);
    else {
        await db.query("DELETE FROM tags_sports_resource_disciplines WHERE sports_app_id=? AND resource_id=?", [access.sportsApp.id, resourceId]);
        await db.query("DELETE FROM tags_turnos_service_resources WHERE resource_id=?", [resourceId]);
        await db.query("DELETE FROM tags_turnos_resources WHERE id=? AND turnos_id=?", [resourceId, turnosId]);
    }
    return Response.json({ ok: true });
}
