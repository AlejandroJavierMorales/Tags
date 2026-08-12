export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosBySlug } from "@/app/modules/turnos/lib/getTurnosPublic";
import { activeBookingStatuses, jsonResponseError, publicBookingAllowed } from "@/app/modules/turnos/lib/turnosService";
import { getTurnosAccess, turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";

function dateOnly(value) {
    const text = String(value || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function dateTime(day, time) {
    return new Date(`${day}T${time}`);
}

function isoDate(value) {
    return value.toISOString().slice(0, 10);
}

function reservationStatus(rows) {
    if (rows.some(row => ["confirmed", "checked_in", "in_progress"].includes(row.status))) return "confirmed";
    if (rows.some(row => row.status === "pending")) return "pending";
    return "available";
}

export async function GET(req) {
    const params = new URL(req.url).searchParams;
    const slug = params.get("slug");
    const businessId = String(params.get("businessId") || "");
    const turnosId = Number(params.get("turnosId") || 0);
    const adminRequest = Boolean(businessId && turnosId);
    const serviceId = Number(params.get("serviceId") || 0);
    const locationId = Number(params.get("locationId") || 0);
    const requestedQuantity = Math.max(1, Math.min(99, Number(params.get("quantity") || 1)));
    const requestedResourceId = Number(params.get("resourceId") || 0);
    const from = dateOnly(params.get("from"));
    const to = dateOnly(params.get("to")) || from;
    if ((!slug && !adminRequest) || !serviceId || !from) return jsonResponseError("turnero, servicio y fecha son requeridos");
    let app;
    if (adminRequest) {
        const access = await getTurnosAccess({ businessId, turnosId, permission: "bookings.create" });
        if (!access.allowed) return turnosAccessResponse(access);
        const [apps] = await db.query("SELECT * FROM tags_turnos_apps WHERE id=? AND business_id=? LIMIT 1", [turnosId,businessId]);
        app = apps[0];
    } else app = await getTurnosBySlug(slug);
    if (!app) return jsonResponseError("Página de Turnos no encontrada", 404, "TURNOS_NOT_FOUND");
    const [serviceRows] = await db.query(
        `SELECT s.* FROM tags_turnos_services s WHERE s.id = ? AND s.turnos_id = ? AND s.is_active = 1 AND s.is_visible = 1 LIMIT 1`,
        [serviceId, app.id]
    );
    const service = serviceRows[0];
    if (!service || (!adminRequest && !publicBookingAllowed(service))) return jsonResponseError("Este servicio no está disponible", 403, "BOOKING_DISABLED");
    const durationMinutes = service.booking_mode === "rental" ? Math.max(15, Math.min(1440, Number(params.get("durationMinutes") || service.duration_minutes))) : Number(service.duration_minutes);
    const [locationRows] = await db.query(
        `SELECT l.id FROM tags_turnos_locations l
         INNER JOIN tags_turnos_service_locations sl ON sl.location_id = l.id AND sl.service_id = ? AND sl.is_active = 1
         WHERE l.turnos_id = ? AND l.is_active = 1 AND (? = 0 OR l.id = ?)`,
        [serviceId, app.id, locationId, locationId]
    );
    const locations = locationRows.length ? locationRows.map(row => row.id) : locationId ? [] : [null];
    if (!locations.length) return Response.json({ ok: true, slots: [] });
    const startDay = new Date(`${from}T00:00:00`);
    const endDay = new Date(`${to || from}T23:59:59`);
    if (Number.isNaN(startDay.getTime()) || endDay < startDay || endDay - startDay > 1000 * 60 * 60 * 24 * 31) return jsonResponseError("Rango de fechas inválido");
    const [requirements] = await db.query(
        `SELECT rr.*, rt.code AS resource_type_code FROM tags_turnos_service_resource_requirements rr
         INNER JOIN tags_turnos_resource_types rt ON rt.id = rr.resource_type_id WHERE rr.service_id = ?`, [serviceId]
    );
    const [resourceRows] = await db.query(
        `SELECT r.* FROM tags_turnos_resources r
         INNER JOIN tags_turnos_service_resources sr ON sr.resource_id = r.id AND sr.service_id = ? AND sr.is_active = 1
         WHERE r.turnos_id = ? AND r.is_active = 1`, [serviceId, app.id]
    );
    const [rules] = await db.query(
        `SELECT * FROM tags_turnos_schedule_rules WHERE turnos_id = ? AND is_active = 1
         AND (scope_type = 'app' OR scope_type = 'resource' OR (scope_type = 'location' AND scope_id IN (${locations.filter(Boolean).map(() => "?").join(",") || "NULL"})))`,
        [app.id, ...locations.filter(Boolean)]
    );
    const activeStatuses = activeBookingStatuses();
    const placeholders = activeStatuses.map(() => "?").join(",");
    const [booked] = await db.query(
        `SELECT br.resource_id, br.starts_at, br.ends_at, br.units, b.status FROM tags_turnos_booking_resources br
         INNER JOIN tags_turnos_bookings b ON b.id = br.booking_id
         WHERE b.turnos_id = ? AND b.status IN (${placeholders})
         AND br.starts_at < ? AND br.ends_at > ?`,
        [app.id, ...activeStatuses, endDay, startDay]
    );
    const [exceptions] = await db.query(`SELECT scope_type,scope_id,starts_at,ends_at FROM tags_turnos_schedule_exceptions WHERE turnos_id=? AND exception_type='closed' AND starts_at<? AND ends_at>?`, [app.id,endDay,startDay]);
    const [directBookings] = await db.query(
        `SELECT starts_at, ends_at, status FROM tags_turnos_bookings
         WHERE turnos_id = ? AND service_id = ? AND location_id = ?
         AND status IN (${placeholders}) AND starts_at < ? AND ends_at > ?`,
        [app.id, serviceId, locationId, ...activeStatuses, endDay, startDay]
    );
    let adminBookings = [];
    if (adminRequest) {
        const [rows] = await db.query(
            `SELECT DISTINCT b.id,b.booking_number,b.status,b.starts_at,b.ends_at,b.party_size,
                    c.name customer_name,c.email customer_email,c.phone customer_phone
             FROM tags_turnos_bookings b
             INNER JOIN tags_turnos_customers c ON c.id=b.customer_id
             INNER JOIN tags_turnos_booking_resources br ON br.booking_id=b.id
             WHERE b.turnos_id=? AND b.service_id=? AND (?=0 OR b.location_id=?)
             AND (?=0 OR br.resource_id=?) AND b.starts_at<? AND b.ends_at>?
             ORDER BY b.starts_at`,
            [app.id, serviceId, locationId, locationId, requestedResourceId, requestedResourceId, endDay, startDay]
        );
        adminBookings = rows;
    }
    const slots = [];
    const seenSlots = new Set();
    for (let cursor = new Date(startDay); cursor <= endDay; cursor.setDate(cursor.getDate() + 1)) {
        const day = isoDate(cursor);
        const weekday = cursor.getDay();
        const dayRules = rules.filter(rule => Number(rule.weekday) === weekday && (rule.scope_type !== "resource" || !requestedResourceId || Number(rule.scope_id) === requestedResourceId) && (!rule.valid_from || day >= String(rule.valid_from).slice(0, 10)) && (!rule.valid_until || day <= String(rule.valid_until).slice(0, 10)));
        const requestedResourceRules = requestedResourceId ? dayRules.filter(rule => rule.scope_type === "resource" && Number(rule.scope_id) === requestedResourceId) : [];
        const generationRules = requestedResourceRules.length ? requestedResourceRules : dayRules.filter(rule => rule.scope_type !== "resource");
        for (const rule of generationRules) {
            const interval = Math.max(5, Number(rule.slot_interval_minutes || 30));
            for (let time = dateTime(day, rule.start_time); time.getTime() + (durationMinutes + Number(service.buffer_before_minutes) + Number(service.buffer_after_minutes)) * 60000 <= dateTime(day, rule.end_time).getTime(); time = new Date(time.getTime() + interval * 60000)) {
                const start = new Date(time.getTime() - Number(service.buffer_before_minutes) * 60000);
                const end = new Date(time.getTime() + (durationMinutes + Number(service.buffer_after_minutes)) * 60000);
                const slotKey = time.toISOString();
                if (seenSlots.has(slotKey)) continue;
                seenSlots.add(slotKey);
                const baseRules = dayRules.filter(item => item.scope_type !== "resource");
                const scheduleAllows = resource => {
                    const ownRules = dayRules.filter(item => item.scope_type === "resource" && Number(item.scope_id) === Number(resource.id));
                    const applicable = ownRules.length ? ownRules : baseRules;
                    const scheduled=applicable.some(item => start >= dateTime(day, item.start_time) && end <= dateTime(day, item.end_time));
                    const blocked=exceptions.some(item => (item.scope_type === "app" || (item.scope_type === "resource" && Number(item.scope_id) === Number(resource.id))) && new Date(item.starts_at) < end && new Date(item.ends_at) > start);
                    return scheduled && !blocked;
                };
                const allocations = [];
                let availableUnits = Number.POSITIVE_INFINITY;
                let totalUnits = Number.POSITIVE_INFINITY;
                let status = "available";
                const outsidePolicy = !adminRequest && (time.getTime() < Date.now() + Math.max(0, Number(service.min_notice_minutes || 0)) * 60000 || time.getTime() > Date.now() + Math.max(1, Number(service.max_advance_days || 90)) * 86400000);
                if (requirements.length) {
                    for (const requirement of requirements) {
                        let remaining = requestedQuantity * Math.max(1, Number(requirement.quantity_required || 1));
                        const candidates = resourceRows.filter(resource => Number(resource.resource_type_id) === Number(requirement.resource_type_id) && (!requestedResourceId || Number(resource.id) === requestedResourceId) && scheduleAllows(resource));
                        const capacities = candidates.map(resource => {
                            const used = booked.filter(item => Number(item.resource_id) === Number(resource.id) && new Date(item.starts_at) < end && new Date(item.ends_at) > start).reduce((sum, item) => sum + Math.max(1, Number(item.units || 1)), 0);
                            return { resource, free: Math.max(0, Math.max(1, Number(resource.capacity || 1)) - used) };
                        });
                        totalUnits = Math.min(totalUnits, Math.floor(capacities.reduce((sum, item) => sum + Math.max(1, Number(item.resource.capacity || 1)), 0) / Math.max(1, Number(requirement.quantity_required || 1))));
                        availableUnits = Math.min(availableUnits, Math.floor(capacities.reduce((sum, item) => sum + item.free, 0) / Math.max(1, Number(requirement.quantity_required || 1))));
                        for (const item of capacities) {
                            const units = Math.min(remaining, item.free);
                            if (units > 0) allocations.push({ resourceId: item.resource.id, requirementId: requirement.id, units });
                            remaining -= units;
                            if (remaining <= 0) break;
                        }
                        if (remaining > 0) { allocations.length = 0; break; }
                    }
                    if (!allocations.length) {
                        status = reservationStatus(booked.filter(item => new Date(item.starts_at) < end && new Date(item.ends_at) > start));
                        if (status === "available") status = "blocked";
                    }
                } else {
                    status = reservationStatus(directBookings.filter(item => new Date(item.starts_at) < end && new Date(item.ends_at) > start));
                }
                if (outsidePolicy) status = "blocked";
                const normalizedAvailable = Number.isFinite(availableUnits) ? availableUnits : status === "available" ? 1 : 0;
                const normalizedTotal = Number.isFinite(totalUnits) ? totalUnits : 1;
                if (!outsidePolicy && normalizedTotal > 0) status = normalizedAvailable <= 0 ? "full" : normalizedAvailable < normalizedTotal ? "partial" : "available";
                slots.push({ startsAt: time.toISOString(), endsAt: new Date(time.getTime() + durationMinutes * 60000).toISOString(), durationMinutes, totalUnits: normalizedTotal, reservedUnits: Math.max(0, normalizedTotal - normalizedAvailable), availableUnits: normalizedAvailable, resourceIds: allocations.map(item => item.resourceId), resourceAllocations: allocations, locationIds: locations.filter(Boolean), status });
            }
        }
    }
    return Response.json({ ok: true, timezone: app.timezone, service, slots, adminBookings });
}
