export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosAccess, turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { calculateDeposit, cleanText, createBookingNumber, createPublicToken, hashToken, jsonResponseError, resolveDepositPolicy } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const params = new URL(req.url).searchParams;
    const businessId = params.get("businessId");
    const turnosId = Number(params.get("turnosId") || 0);
    const status = String(params.get("status") || "");
    const from = String(params.get("from") || "").slice(0, 10);
    const to = String(params.get("to") || "").slice(0, 10);
    if (!businessId) return jsonResponseError("businessId es requerido");
    const access = await getTurnosAccess({ businessId, turnosId, permission: "bookings.view" });
    if (!access.allowed) return turnosAccessResponse(access);
    const conditions = [];
    const queryParams = [businessId, turnosId, turnosId];
    if (["pending", "confirmed", "checked_in", "in_progress", "completed", "rejected", "cancelled", "no_show"].includes(status)) {
        conditions.push("b.status = ?");
        queryParams.push(status);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
        conditions.push("b.starts_at >= ?");
        queryParams.push(`${from} 00:00:00`);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        conditions.push("b.starts_at < DATE_ADD(?, INTERVAL 1 DAY)");
        queryParams.push(`${to} 00:00:00`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(
        `SELECT b.*, s.name AS service_name, l.name AS location_name, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
                (SELECT GROUP_CONCAT(DISTINCT r.name ORDER BY r.name SEPARATOR ', ') FROM tags_turnos_booking_resources br INNER JOIN tags_turnos_resources r ON r.id=br.resource_id WHERE br.booking_id=b.id) AS resource_names,
                (SELECT br.resource_id FROM tags_turnos_booking_resources br WHERE br.booking_id=b.id ORDER BY br.resource_id LIMIT 1) AS resource_id,
                (SELECT COALESCE(SUM(br.units),0) FROM tags_turnos_booking_resources br WHERE br.booking_id=b.id) AS reserved_units
         FROM tags_turnos_bookings b
         INNER JOIN tags_turnos_apps a ON a.id = b.turnos_id AND a.business_id = ? AND (? = 0 OR a.id = ?)
         INNER JOIN tags_turnos_services s ON s.id = b.service_id
         INNER JOIN tags_turnos_locations l ON l.id = b.location_id
         INNER JOIN tags_turnos_customers c ON c.id = b.customer_id
         ${where}
        ORDER BY b.starts_at ASC LIMIT 500`, queryParams
    );
    const [locations] = await db.query("SELECT id,name FROM tags_turnos_locations WHERE turnos_id=? AND is_active=1 ORDER BY sort_order,id", [turnosId]);
    return Response.json({ ok: true, bookings: rows, locations });
}

export async function POST(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const businessId = String(body?.businessId || "");
    const turnosId = Number(body?.turnosId || 0);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "bookings.create" });
    if (!access.allowed) return turnosAccessResponse(access);
    const serviceId = Number(body?.serviceId || 0);
    const locationId = Number(body?.locationId || 0);
    const starts = new Date(body?.startsAt);
    const customer = body?.customer || {};
    const name = cleanText(customer.name);
    const email = cleanText(customer.email, 190).toLowerCase() || null;
    const phone = cleanText(customer.phone, 60) || null;
    const requestedResourceId = Number(body?.resourceId || 0);
    const requestedCustomerId = Number(body?.customerId || 0);
    if (!serviceId || !locationId || !requestedResourceId || Number.isNaN(starts.getTime()) || !name || (!email && !phone)) return jsonResponseError("servicio, recurso, horario, nombre y contacto son requeridos");
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [apps] = await connection.query("SELECT * FROM tags_turnos_apps WHERE id = ? AND business_id = ? LIMIT 1 FOR UPDATE", [turnosId, businessId]);
        const app = apps[0];
        const [services] = await connection.query("SELECT * FROM tags_turnos_services WHERE id = ? AND turnos_id = ? AND is_active = 1 LIMIT 1", [serviceId, app?.id]);
        const service = services[0];
        if (!app || !service) { await connection.rollback(); return jsonResponseError("Servicio no encontrado", 404, "SERVICE_NOT_FOUND"); }
        const [chosenResources] = await connection.query(`SELECT r.id,r.capacity,r.public_metadata_json FROM tags_turnos_resources r INNER JOIN tags_turnos_service_resources sr ON sr.resource_id=r.id AND sr.service_id=? AND sr.is_active=1 WHERE r.id=? AND r.turnos_id=? AND r.is_active=1 LIMIT 1 FOR UPDATE`, [serviceId, requestedResourceId, app.id]);
        const chosenResource = chosenResources[0];
        if (!chosenResource) { await connection.rollback(); return jsonResponseError("Recurso inválido para este servicio", 400, "RESOURCE_INVALID"); }
        const metadata = typeof chosenResource.public_metadata_json === "string" ? JSON.parse(chosenResource.public_metadata_json || "{}") : chosenResource.public_metadata_json || {};
        const allowsConsecutive = metadata.allowConsecutiveBookings === true;
        const maxConsecutive = allowsConsecutive ? Math.max(2, Math.min(96, Number(metadata.maxConsecutiveSlots || 2))) : 1;
        const turnCount = Math.max(1, Math.min(maxConsecutive, Math.floor(Number(body?.turnCount || 1))));
        if (!allowsConsecutive && Number(body?.turnCount || 1) > 1) { await connection.rollback(); return jsonResponseError("Este recurso no permite turnos consecutivos", 409); }
        const ends = new Date(starts.getTime() + Number(service.duration_minutes) * turnCount * 60000);
        const weekday = starts.getDay(), day = starts.toISOString().slice(0,10), startMinute = starts.getHours()*60+starts.getMinutes(), endMinute = ends.getHours()*60+ends.getMinutes();
        const minute = value => { const [hours,minutes]=String(value).split(":").map(Number); return hours*60+minutes; };
        const [ownRules] = await connection.query("SELECT start_time,end_time,valid_from,valid_until FROM tags_turnos_schedule_rules WHERE turnos_id=? AND scope_type='resource' AND scope_id=? AND weekday=? AND is_active=1", [app.id, requestedResourceId, weekday]);
        const [generalRules] = ownRules.length ? [[]] : await connection.query("SELECT start_time,end_time,valid_from,valid_until FROM tags_turnos_schedule_rules WHERE turnos_id=? AND scope_type='app' AND weekday=? AND is_active=1", [app.id, weekday]);
        const scheduled = (ownRules.length ? ownRules : generalRules).some(rule => (!rule.valid_from || day>=String(rule.valid_from).slice(0,10)) && (!rule.valid_until || day<=String(rule.valid_until).slice(0,10)) && startMinute>=minute(rule.start_time) && endMinute<=minute(rule.end_time));
        const [closed] = await connection.query("SELECT id FROM tags_turnos_schedule_exceptions WHERE turnos_id=? AND exception_type='closed' AND (scope_type='app' OR (scope_type='resource' AND scope_id=?)) AND starts_at<? AND ends_at>? LIMIT 1", [app.id,requestedResourceId,ends,starts]);
        if (!scheduled || closed.length) { await connection.rollback(); return jsonResponseError("El horario no está habilitado para este recurso", 409, "SCHEDULE_NOT_AVAILABLE"); }
        const quantity = Math.max(1, Number(body?.partySize || 1));
        const [requirements] = await connection.query("SELECT * FROM tags_turnos_service_resource_requirements WHERE service_id=?", [serviceId]);
        const selectedResources = [];
        for (const requirement of requirements) {
            let remaining = quantity * Math.max(1, Number(requirement.quantity_required || 1));
            const [resourceRows] = await connection.query(`SELECT r.id,r.capacity FROM tags_turnos_resources r INNER JOIN tags_turnos_service_resources sr ON sr.resource_id=r.id AND sr.service_id=? AND sr.is_active=1 WHERE r.turnos_id=? AND r.resource_type_id=? AND r.id=? AND r.is_active=1 FOR UPDATE`, [serviceId, app.id, requirement.resource_type_id, requestedResourceId]);
            for (const resource of resourceRows) {
                const [usage] = await connection.query(`SELECT COALESCE(SUM(COALESCE(br.units,1)),0) used_units FROM tags_turnos_booking_resources br INNER JOIN tags_turnos_bookings b ON b.id=br.booking_id WHERE br.resource_id=? AND b.status IN ('pending','confirmed','checked_in','in_progress') AND br.starts_at<? AND br.ends_at>?`, [resource.id, ends, starts]);
                const units = Math.min(remaining, Math.max(0, Math.max(1, Number(resource.capacity || 1)) - Number(usage[0]?.used_units || 0)));
                if (units > 0) selectedResources.push({ id: resource.id, requirementId: requirement.id, units });
                remaining -= units;
                if (remaining <= 0) break;
            }
            if (remaining > 0) { await connection.rollback(); return jsonResponseError("No hay capacidad suficiente para ese horario", 409, "SLOT_CONFLICT"); }
        }
        if (!requirements.length) {
            const [conflicts] = await connection.query(`SELECT id FROM tags_turnos_bookings WHERE turnos_id=? AND service_id=? AND location_id=? AND status IN ('pending','confirmed','checked_in','in_progress') AND starts_at<? AND ends_at>? LIMIT 1`, [app.id, serviceId, locationId, ends, starts]);
            if (conflicts.length) { await connection.rollback(); return jsonResponseError("El horario ya está ocupado", 409, "SLOT_CONFLICT"); }
        }
        const [customers] = requestedCustomerId
            ? await connection.query("SELECT id FROM tags_turnos_customers WHERE id=? AND business_id=? LIMIT 1", [requestedCustomerId, businessId])
            : await connection.query("SELECT id FROM tags_turnos_customers WHERE business_id = ? AND ((email IS NOT NULL AND email = ?) OR (phone IS NOT NULL AND phone = ?)) LIMIT 1", [businessId, email, phone]);
        let customerId = customers[0]?.id;
        if (requestedCustomerId && !customerId) { await connection.rollback(); return jsonResponseError("El cliente seleccionado no existe", 404, "CUSTOMER_NOT_FOUND"); }
        if (!customerId) { const [result] = await connection.query("INSERT INTO tags_turnos_customers (business_id, name, email, phone, privacy_consent_at) VALUES (?, ?, ?, ?, NOW())", [businessId, name, email, phone]); customerId = result.insertId; }
        const policy = resolveDepositPolicy(app, service);
        const depositAmount = calculateDeposit(policy, service.price);
        const depositRequired = depositAmount > 0 && policy.requiredForAdmin;
        const status = depositRequired && policy.confirmAfterPayment ? "pending" : "confirmed";
        const token = createPublicToken();
        const bookingNumber = createBookingNumber();
        const [result] = await connection.query(`INSERT INTO tags_turnos_bookings (turnos_id, location_id, service_id, customer_id, booking_number, public_token_hash, status, starts_at, ends_at, timezone, party_size, price_snapshot, currency, payment_status, deposit_required, deposit_amount, deposit_due_at, payment_policy_snapshot_json, customer_notes, internal_notes, source, created_by_type, created_by_id, confirmed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'owner', ?, ?)`, [app.id, locationId, serviceId, customerId, bookingNumber, hashToken(token), status, starts, ends, app.timezone, Math.max(1, Number(body?.partySize || 1)), service.price, service.currency || app.currency, depositRequired ? "pending" : "not_required", depositRequired ? 1 : 0, depositRequired ? depositAmount : null, depositRequired ? new Date(Date.now() + policy.holdMinutes * 60000) : null, JSON.stringify(policy), cleanText(body?.customerNotes, 1000), cleanText(body?.internalNotes, 1000), access.session?.userId || access.session?.id || null, status === "confirmed" ? new Date() : null]);
        for (const resource of selectedResources) await connection.query("INSERT INTO tags_turnos_booking_resources (booking_id,requirement_id,resource_id,units,starts_at,ends_at) VALUES (?,?,?,?,?,?)", [result.insertId, resource.requirementId, resource.id, resource.units, starts, ends]);
        await connection.query("INSERT INTO tags_turnos_booking_status_history (booking_id, to_status, actor_type, reason) VALUES (?, ?, 'owner', 'Reserva creada desde el panel')", [result.insertId, status]);
        await connection.commit();
        return Response.json({ ok: true, booking: { id: result.insertId, bookingNumber, status, depositRequired, depositAmount, token } }, { status: 201 });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("TURNOS ADMIN BOOKING ERROR:", error);
        return Response.json({ ok: false, error: "No se pudo crear la reserva" }, { status: 500 });
    } finally { if (connection) connection.release(); }
}

export async function DELETE(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const businessId = String(body?.businessId || "");
    const turnosId = Number(body?.turnosId || 0);
    const bookingId = Number(body?.bookingId || 0);
    if (!businessId || !turnosId || !bookingId) return jsonResponseError("Reserva inválida");
    const access = await getTurnosAccess({ businessId, turnosId, permission: "bookings.cancel" });
    if (!access.allowed) return turnosAccessResponse(access);
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [rows] = await connection.query(
            `SELECT b.id,b.customer_id,b.booking_number FROM tags_turnos_bookings b
             INNER JOIN tags_turnos_apps a ON a.id=b.turnos_id
             WHERE b.id=? AND b.turnos_id=? AND a.business_id=? LIMIT 1 FOR UPDATE`,
            [bookingId, turnosId, businessId]
        );
        const booking = rows[0];
        if (!booking) { await connection.rollback(); return jsonResponseError("Reserva no encontrada", 404, "BOOKING_NOT_FOUND"); }
        await connection.query("DELETE FROM tags_turnos_notification_deliveries WHERE booking_id=?", [bookingId]);
        await connection.query("DELETE FROM tags_turnos_payment_intents WHERE booking_id=?", [bookingId]);
        await connection.query("DELETE FROM tags_turnos_booking_tokens WHERE booking_id=?", [bookingId]);
        await connection.query("DELETE FROM tags_turnos_booking_status_history WHERE booking_id=?", [bookingId]);
        await connection.query("DELETE FROM tags_turnos_booking_resources WHERE booking_id=?", [bookingId]);
        await connection.query("DELETE FROM tags_turnos_bookings WHERE id=? AND turnos_id=?", [bookingId, turnosId]);
        await connection.query("DELETE FROM tags_turnos_customers WHERE id=? AND NOT EXISTS (SELECT 1 FROM tags_turnos_bookings WHERE customer_id=?)", [booking.customer_id, booking.customer_id]);
        await connection.commit();
        return Response.json({ ok: true, bookingNumber: booking.booking_number });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("TURNOS ADMIN BOOKING DELETE ERROR:", error);
        return Response.json({ ok: false, error: "No se pudo eliminar la reserva" }, { status: 500 });
    } finally { if (connection) connection.release(); }
}
