export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosAccess, turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { cleanText, jsonResponseError, parseJson } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const businessId = new URL(req.url).searchParams.get("businessId");
    const turnosId = Number(new URL(req.url).searchParams.get("turnosId") || 0);
    if (!businessId) return jsonResponseError("businessId es requerido");
    const access = await getTurnosAccess({ businessId, turnosId, permission: "services.view" });
    if (!access.allowed) return turnosAccessResponse(access);
    const [rows] = await db.query(
        `SELECT s.*, c.name AS category_name,
                (SELECT rr.resource_type_id FROM tags_turnos_service_resource_requirements rr WHERE rr.service_id = s.id ORDER BY rr.id ASC LIMIT 1) AS required_resource_type_id
         FROM tags_turnos_services s
         LEFT JOIN tags_turnos_service_categories c ON c.id = s.category_id
         INNER JOIN tags_turnos_apps a ON a.id = s.turnos_id AND a.business_id = ? AND (? = 0 OR a.id = ?)
         WHERE s.is_active = 1
         ORDER BY s.sort_order ASC, s.id ASC`,
        [businessId, turnosId, turnosId]
    );
    return Response.json({ ok: true, services: rows });
}

export async function POST(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const businessId = String(body?.businessId || "");
    const turnosId = Number(body?.turnosId || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "services.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const name = cleanText(body?.name);
    if (!name) return jsonResponseError("El nombre del servicio es requerido");
    const duration = Math.max(1, Number(body?.durationMinutes || 30));
    if (!turnosId) return jsonResponseError("turnosId es requerido");
    const [apps] = await db.query("SELECT * FROM tags_turnos_apps WHERE id = ? AND business_id = ? LIMIT 1", [turnosId, businessId]);
    const app = apps[0];
    if (!app) return jsonResponseError("Tags Turnos no encontrado", 404, "TURNOS_NOT_FOUND");
    const resourceTypeId = Number(body?.resourceTypeId || 0);
    if (resourceTypeId) {
        const [types] = await db.query("SELECT id FROM tags_turnos_resource_types WHERE id = ? AND turnos_id = ? AND is_active = 1 LIMIT 1", [resourceTypeId, app.id]);
        if (!types.length) return jsonResponseError("Tipo de recurso inválido", 400, "RESOURCE_TYPE_INVALID");
    }
    const appPublicPolicy = parseJson(app.public_booking_policy_json, {});
    const defaultChannel = ["admin_only", "public_request", "public_auto_confirm", "hybrid"].includes(appPublicPolicy.defaultChannel)
        ? appPublicPolicy.defaultChannel : "admin_only";
    const channel = ["admin_only", "public_request", "public_auto_confirm", "hybrid"].includes(body?.bookingChannelMode)
        ? body.bookingChannelMode : defaultChannel;
    const confirmation = ["automatic", "manual"].includes(body?.confirmationMode) ? body.confirmationMode : (["automatic", "manual"].includes(appPublicPolicy.defaultConfirmation) ? appPublicPolicy.defaultConfirmation : "automatic");
    const identification = ["contact", "magic_link", "account_required"].includes(body?.customerIdentificationMode)
        ? body.customerIdentificationMode : (["contact", "magic_link"].includes(appPublicPolicy.defaultIdentification) ? appPublicPolicy.defaultIdentification : "contact");
    const [result] = await db.query(
        `INSERT INTO tags_turnos_services
         (turnos_id, category_id, name, description, booking_mode, confirmation_mode,
          booking_channel_mode, customer_identification_mode, public_availability_enabled,
          duration_minutes, buffer_before_minutes, buffer_after_minutes, capacity,
          min_notice_minutes, max_advance_days, cancellation_notice_minutes, reschedule_notice_minutes, price, currency, deposit_policy_override_json,
          is_price_visible, is_visible, is_active, sort_order, settings_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        [
            app.id, Number(body?.categoryId || 0) || null, name, cleanText(body?.description, 500),
            ["individual", "group", "rental"].includes(body?.bookingMode) ? body.bookingMode : "individual",
            confirmation, channel, identification, body?.publicAvailabilityEnabled === false ? 0 : 1,
            duration, Math.max(0, Number(body?.bufferBeforeMinutes || 0)), Math.max(0, Number(body?.bufferAfterMinutes || 0)),
            Math.max(1, Number(body?.capacity || 1)), Math.max(0, Number(body?.minNoticeMinutes || 0)),
            Math.max(1, Number(body?.maxAdvanceDays || 90)), Math.max(0, Number(body?.cancellationNoticeMinutes ?? appPublicPolicy.cancellationNoticeMinutes ?? 0)), Math.max(0, Number(body?.rescheduleNoticeMinutes ?? appPublicPolicy.rescheduleNoticeMinutes ?? 0)), body?.price == null ? null : Number(body.price),
            cleanText(body?.currency || app.currency || "ARS", 10),
            body?.depositPolicy ? JSON.stringify(body.depositPolicy) : null, body?.isPriceVisible === false ? 0 : 1,
            Number(body?.sortOrder || 0), JSON.stringify(body?.settings || {})
        ]
    );
    const [locations] = await db.query("SELECT id FROM tags_turnos_locations WHERE turnos_id = ? AND is_active = 1", [app.id]);
    for (const location of locations) {
        await db.query("INSERT IGNORE INTO tags_turnos_service_locations (service_id, location_id) VALUES (?, ?)", [result.insertId, location.id]);
    }
    if (resourceTypeId) {
        await db.query("INSERT INTO tags_turnos_service_resource_requirements (service_id, resource_type_id, quantity_required) VALUES (?, ?, 1)", [result.insertId, resourceTypeId]);
    }
    return Response.json({ ok: true, serviceId: result.insertId }, { status: 201 });
}

export async function PUT(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const businessId = String(body?.businessId || "");
    const serviceId = Number(body?.serviceId || 0);
    const turnosId = Number(body?.turnosId || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "services.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    if (!serviceId || !cleanText(body?.name)) return jsonResponseError("serviceId y name son requeridos");
    const resourceTypeId = Number(body?.resourceTypeId || 0);
    if (resourceTypeId) {
        const [types] = await db.query("SELECT id FROM tags_turnos_resource_types WHERE id = ? AND turnos_id = ? AND is_active = 1 LIMIT 1", [resourceTypeId, turnosId]);
        if (!types.length) return jsonResponseError("Tipo de recurso inválido", 400, "RESOURCE_TYPE_INVALID");
    }
    const [result] = await db.query(
        `UPDATE tags_turnos_services s INNER JOIN tags_turnos_apps a ON a.id = s.turnos_id AND a.business_id = ? AND a.id = ?
         SET s.name = ?, s.description = ?, s.booking_mode = ?, s.duration_minutes = ?,
             s.booking_channel_mode = ?, s.confirmation_mode = ?, s.customer_identification_mode = ?, s.cancellation_notice_minutes = ?, s.reschedule_notice_minutes = ?, s.updated_at = NOW()
         WHERE s.id = ? AND s.is_active = 1`,
        [businessId, turnosId, cleanText(body.name), cleanText(body.description, 500),
            ["individual", "group", "rental"].includes(body?.bookingMode) ? body.bookingMode : "individual",
            Math.max(1, Number(body.durationMinutes || 30)),
            ["admin_only", "public_request", "public_auto_confirm", "hybrid"].includes(body?.bookingChannelMode) ? body.bookingChannelMode : "admin_only",
            ["automatic", "manual"].includes(body?.confirmationMode) ? body.confirmationMode : "automatic",
            ["contact", "magic_link"].includes(body?.customerIdentificationMode) ? body.customerIdentificationMode : "contact",
            Math.max(0, Number(body?.cancellationNoticeMinutes || 0)), Math.max(0, Number(body?.rescheduleNoticeMinutes || 0)), serviceId]
    );
    if (!result.affectedRows) return jsonResponseError("Servicio no encontrado", 404);
    await db.query("DELETE FROM tags_turnos_service_resource_requirements WHERE service_id = ?", [serviceId]);
    if (resourceTypeId) {
        await db.query("INSERT INTO tags_turnos_service_resource_requirements (service_id, resource_type_id, quantity_required) VALUES (?, ?, 1)", [serviceId, resourceTypeId]);
        await db.query(`UPDATE tags_turnos_service_resources sr INNER JOIN tags_turnos_resources r ON r.id=sr.resource_id SET sr.is_active=0 WHERE sr.service_id=? AND r.resource_type_id<>?`, [serviceId, resourceTypeId]);
    }
    return Response.json({ ok: true });
}

export async function DELETE(req) {
    const body = await req.json().catch(() => ({}));
    const businessId = String(body?.businessId || new URL(req.url).searchParams.get("businessId") || "");
    const serviceId = Number(body?.serviceId || new URL(req.url).searchParams.get("serviceId") || 0);
    const turnosId = Number(body?.turnosId || new URL(req.url).searchParams.get("turnosId") || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "services.manage" });
    if (!access.allowed) return turnosAccessResponse(access);
    const [owned] = await db.query("SELECT s.id FROM tags_turnos_services s INNER JOIN tags_turnos_apps a ON a.id=s.turnos_id AND a.business_id=? WHERE s.id=? AND s.turnos_id=? LIMIT 1", [businessId, serviceId, turnosId]);
    if (!owned.length) return jsonResponseError("Servicio no encontrado", 404);
    const [history] = await db.query("SELECT 1 FROM tags_turnos_bookings WHERE service_id=? LIMIT 1", [serviceId]);
    if (history.length) {
        await db.query("UPDATE tags_turnos_services SET is_active=0,is_visible=0,updated_at=NOW() WHERE id=?", [serviceId]);
        await db.query("UPDATE tags_turnos_service_resources SET is_active=0 WHERE service_id=?", [serviceId]);
    } else {
        await db.query("DELETE FROM tags_turnos_service_resources WHERE service_id=?", [serviceId]);
        await db.query("DELETE FROM tags_turnos_service_resource_requirements WHERE service_id=?", [serviceId]);
        await db.query("DELETE FROM tags_turnos_service_locations WHERE service_id=?", [serviceId]);
        await db.query("DELETE FROM tags_turnos_services WHERE id=?", [serviceId]);
    }
    return Response.json({ ok: true, deletion: history.length ? "archived" : "deleted" });
}
