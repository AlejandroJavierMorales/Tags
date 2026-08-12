export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { cookies } from "next/headers";
import { getTurnosBySlug } from "@/app/modules/turnos/lib/getTurnosPublic";
import {
    calculateDeposit,
    cleanText,
    createBookingNumber,
    createPublicToken,
    hashToken,
    isAutoConfirm,
    jsonResponseError,
    publicBookingAllowed,
    resolveDepositPolicy
} from "@/app/modules/turnos/lib/turnosService";
import { deliverTurnosNotification } from "@/app/modules/turnos/lib/deliverTurnosNotification";
import { getGuestPublicSession } from "@/app/modules/guest-experience/lib/getGuestPublicSession";

function validDate(value) {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) ? date : null;
}

function minuteOfDay(value) { const [hours, minutes] = String(value).split(":").map(Number); return hours * 60 + minutes; }

export async function POST(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const slug = cleanText(body?.slug);
    const serviceId = Number(body?.serviceId || 0);
    const locationId = Number(body?.locationId || 0);
    const starts = validDate(body?.startsAt);
    const customerData = body?.customer || {};
    let name = cleanText(customerData.name);
    let email = cleanText(customerData.email, 190).toLowerCase() || null;
    let phone = cleanText(customerData.phone, 60) || null;
    const requestedQuantity = Math.max(1, Math.min(99, Number(body?.quantity || 1)));
    if (!slug || !serviceId || !locationId || !starts) return jsonResponseError("slug, servicio, sede y horario son requeridos");
    const app = await getTurnosBySlug(slug);
    if (!app) return jsonResponseError("Página de Turnos no encontrada", 404, "TURNOS_NOT_FOUND");
    let guestSession = null;
    const guestExperienceSlug = cleanText(body?.guestExperienceSlug);
    if (guestExperienceSlug) {
        guestSession = await getGuestPublicSession(guestExperienceSlug);
        if (!guestSession || Number(guestSession.business_id) !== Number(app.business_id) || !["reserved", "active"].includes(guestSession.stay_status)) return jsonResponseError("La estadía no autoriza esta reserva", 403, "GUEST_STAY_NOT_ALLOWED");
        const [enabled] = await db.query("SELECT id FROM tags_guest_turnos_integrations WHERE guest_app_id=? AND turnos_id=? AND service_id=? AND is_active=1 LIMIT 1", [guestSession.id, app.id, serviceId]);
        if (!enabled[0]) return jsonResponseError("Este servicio no está habilitado en Mi Estadía", 403, "GUEST_SERVICE_NOT_ALLOWED");
        name = cleanText(guestSession.guest_name);
        email = cleanText(guestSession.guest_email, 190).toLowerCase() || null;
        phone = cleanText(guestSession.guest_phone, 60) || null;
    }
    if (!name || (!email && !phone)) return jsonResponseError("El huésped necesita nombre y un medio de contacto");
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [services] = await connection.query(
            `SELECT * FROM tags_turnos_services WHERE id = ? AND turnos_id = ? AND is_active = 1 AND is_visible = 1 FOR UPDATE`, [serviceId, app.id]
        );
        const service = services[0];
        if (!service || !publicBookingAllowed(service)) {
            await connection.rollback();
            return jsonResponseError("Este servicio no está disponible públicamente", 403, "PUBLIC_BOOKING_DISABLED");
        }
        if (!guestSession && service.customer_identification_mode !== "contact") {
            const authToken = (await cookies()).get("tags_turnos_customer_session")?.value || "";
            const [authRows] = await connection.query(
                `SELECT id FROM tags_turnos_customer_auth_tokens
                 WHERE turnos_id = ? AND email = ? AND token_hash = ? AND expires_at > NOW() LIMIT 1`,
                [app.id, email, hashToken(authToken)]
            );
            if (!authRows.length) {
                await connection.rollback();
                return jsonResponseError("Necesitás identificarte antes de reservar", 401, "CUSTOMER_IDENTIFICATION_REQUIRED");
            }
        }
        const [locations] = await connection.query(
            `SELECT l.id FROM tags_turnos_locations l
             INNER JOIN tags_turnos_service_locations sl ON sl.location_id = l.id AND sl.service_id = ? AND sl.is_active = 1
             WHERE l.id = ? AND l.turnos_id = ? AND l.is_active = 1 LIMIT 1`, [serviceId, locationId, app.id]
        );
        if (!locations.length) {
            await connection.rollback();
            return jsonResponseError("Sede inválida para este servicio", 400, "LOCATION_INVALID");
        }
        const requestedResourceId = Number(body?.resourceId || 0);
        const [selectedResourceRows] = await connection.query(`SELECT r.id,r.public_metadata_json FROM tags_turnos_resources r INNER JOIN tags_turnos_service_resources sr ON sr.resource_id=r.id AND sr.service_id=? AND sr.is_active=1 WHERE r.id=? AND r.turnos_id=? AND r.is_active=1 LIMIT 1`, [serviceId, requestedResourceId, app.id]);
        if (!selectedResourceRows.length) { await connection.rollback(); return jsonResponseError("Recurso inválido para este servicio", 400, "RESOURCE_INVALID"); }
        const resourceMetadata = typeof selectedResourceRows[0].public_metadata_json === "string" ? JSON.parse(selectedResourceRows[0].public_metadata_json || "{}") : selectedResourceRows[0].public_metadata_json || {};
        const allowsConsecutive = resourceMetadata.allowConsecutiveBookings === true;
        const maxConsecutive = allowsConsecutive ? Math.max(2, Math.min(96, Number(resourceMetadata.maxConsecutiveSlots || 2))) : 1;
        const turnCount = Math.max(1, Math.min(maxConsecutive, Number(body?.turnCount || 1)));
        if (!allowsConsecutive && Number(body?.turnCount || 1) > 1) { await connection.rollback(); return jsonResponseError("Este recurso no permite turnos consecutivos", 409, "CONSECUTIVE_NOT_ALLOWED"); }
        const durationMinutes = Number(service.duration_minutes) * turnCount;
        const ends = new Date(starts.getTime() + durationMinutes * 60000);
        if (starts.getTime() < Date.now() + Number(service.min_notice_minutes || 0) * 60000 || starts.getTime() > Date.now() + Number(service.max_advance_days || 90) * 86400000) {
            await connection.rollback();
            return jsonResponseError("El horario está fuera del período permitido", 409, "SLOT_OUTSIDE_POLICY");
        }
        const blockingStatuses = ["pending", "confirmed", "checked_in", "in_progress"];
        const statusParams = blockingStatuses.map(() => "?").join(",");
        const [requirements] = await connection.query(
            "SELECT * FROM tags_turnos_service_resource_requirements WHERE service_id = ?", [serviceId]
        );
        let selectedResources = [];
        for (const requirement of requirements) {
            const [resources] = await connection.query(
                `SELECT r.id, r.capacity FROM tags_turnos_resources r
                 INNER JOIN tags_turnos_service_resources sr ON sr.resource_id = r.id AND sr.service_id = ? AND sr.is_active = 1
                 WHERE r.turnos_id = ? AND r.resource_type_id = ? AND r.is_active = 1 AND (? = 0 OR r.id = ?)
                 FOR UPDATE`,
                [serviceId, app.id, requirement.resource_type_id, requestedResourceId, requestedResourceId]
            );
            let remaining = requestedQuantity * Math.max(1, Number(requirement.quantity_required || 1));
            for (const resource of resources) {
                const weekday = starts.getDay();
                const [ownRules] = await connection.query("SELECT start_time,end_time,valid_from,valid_until FROM tags_turnos_schedule_rules WHERE turnos_id=? AND scope_type='resource' AND scope_id=? AND weekday=? AND is_active=1", [app.id, resource.id, weekday]);
                const [generalRules] = ownRules.length ? [[]] : await connection.query("SELECT start_time,end_time,valid_from,valid_until FROM tags_turnos_schedule_rules WHERE turnos_id=? AND scope_type='app' AND weekday=? AND is_active=1", [app.id, weekday]);
                const day = starts.toISOString().slice(0, 10), startMinute = starts.getHours() * 60 + starts.getMinutes(), endMinute = ends.getHours() * 60 + ends.getMinutes();
                const scheduled = (ownRules.length ? ownRules : generalRules).some(rule => (!rule.valid_from || day >= String(rule.valid_from).slice(0, 10)) && (!rule.valid_until || day <= String(rule.valid_until).slice(0, 10)) && startMinute >= minuteOfDay(rule.start_time) && endMinute <= minuteOfDay(rule.end_time));
                if (!scheduled) continue;
                const [closed] = await connection.query("SELECT id FROM tags_turnos_schedule_exceptions WHERE turnos_id=? AND exception_type='closed' AND (scope_type='app' OR (scope_type='resource' AND scope_id=?)) AND starts_at<? AND ends_at>? LIMIT 1", [app.id, resource.id, ends, starts]);
                if (closed.length) continue;
                const [conflicts] = await connection.query(
                    `SELECT COALESCE(SUM(COALESCE(br.units, 1)), 0) AS used_units FROM tags_turnos_booking_resources br
                     INNER JOIN tags_turnos_bookings b ON b.id = br.booking_id
                     WHERE br.resource_id = ? AND b.status IN (${statusParams})
                     AND br.starts_at < ? AND br.ends_at > ?`,
                    [resource.id, ...blockingStatuses, ends, starts]
                );
                const availableUnits = Math.max(0, Math.max(1, Number(resource.capacity || 1)) - Number(conflicts[0]?.used_units || 0));
                const units = Math.min(remaining, availableUnits);
                if (units > 0) selectedResources.push({ ...resource, requirementId: requirement.id, units });
                remaining -= units;
                if (remaining <= 0) break;
            }
            if (remaining > 0) {
                await connection.rollback();
                return jsonResponseError("El horario ya no está disponible", 409, "SLOT_CONFLICT");
            }
        }
        if (!requirements.length) {
            const [conflicts] = await connection.query(
                `SELECT id FROM tags_turnos_bookings WHERE turnos_id = ? AND service_id = ? AND location_id = ?
                 AND status IN (${statusParams}) AND starts_at < ? AND ends_at > ? LIMIT 1`,
                [app.id, serviceId, locationId, ...blockingStatuses, ends, starts]
            );
            if (conflicts.length) {
                await connection.rollback();
                return jsonResponseError("El horario ya no está disponible", 409, "SLOT_CONFLICT");
            }
        }
        const [customers] = await connection.query(
            `SELECT id FROM tags_turnos_customers WHERE business_id = ? AND ((email IS NOT NULL AND email = ?) OR (phone IS NOT NULL AND phone = ?)) LIMIT 1 FOR UPDATE`,
            [app.business_id, email, phone]
        );
        let customerId = customers[0]?.id;
        if (customerId) {
            await connection.query("UPDATE tags_turnos_customers SET name = ?, email = COALESCE(?, email), phone = COALESCE(?, phone), privacy_consent_at = NOW() WHERE id = ?", [name, email, phone, customerId]);
        } else {
            const [result] = await connection.query("INSERT INTO tags_turnos_customers (business_id, name, email, phone, privacy_consent_at) VALUES (?, ?, ?, ?, NOW())", [app.business_id, name, email, phone]);
            customerId = result.insertId;
        }
        const policy = resolveDepositPolicy(app, service);
        const depositAmount = calculateDeposit(policy, service.price);
        const depositRequired = depositAmount > 0 && policy.requiredForPublic;
        const auto = isAutoConfirm(service) && (!depositRequired || !policy.confirmAfterPayment);
        const status = auto ? "confirmed" : "pending";
        const paymentStatus = depositRequired ? "pending" : "not_required";
        const publicToken = createPublicToken();
        const bookingNumber = createBookingNumber();
        const [result] = await connection.query(
            `INSERT INTO tags_turnos_bookings
             (turnos_id, location_id, service_id, customer_id, booking_number, public_token_hash, status,
              starts_at, ends_at, timezone, party_size, price_snapshot, currency, payment_status,
              deposit_required, deposit_amount, deposit_due_at, payment_policy_snapshot_json,
              customer_notes, source, created_by_type, confirmed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', 'customer', ?)` ,
            [app.id, locationId, serviceId, customerId, bookingNumber, hashToken(publicToken), status,
                starts, ends, app.timezone, Math.max(requestedQuantity, Number(body?.partySize || 1)), service.price, service.currency || app.currency,
                paymentStatus, depositRequired ? 1 : 0, depositRequired ? depositAmount : null,
                depositRequired ? new Date(Date.now() + policy.holdMinutes * 60000) : null,
                JSON.stringify(policy), cleanText(body?.notes, 1000), auto ? new Date() : null]
        );
        const bookingId = result.insertId;
        for (const resource of selectedResources) {
            await connection.query("INSERT INTO tags_turnos_booking_resources (booking_id, requirement_id, resource_id, starts_at, ends_at, units) VALUES (?, ?, ?, ?, ?, ?)", [bookingId, resource.requirementId, resource.id, starts, ends, resource.units]);
        }
        await connection.query("INSERT INTO tags_turnos_booking_status_history (booking_id, from_status, to_status, actor_type, reason) VALUES (?, NULL, ?, 'customer', ?)", [bookingId, status, depositRequired ? "Reserva creada con seña pendiente" : "Reserva creada"]);
        if (guestSession) await connection.query("INSERT INTO tags_guest_turnos_bookings (guest_app_id,stay_id,guest_id,turnos_id,booking_id) VALUES (?,?,?,?,?)", [guestSession.id, guestSession.stay_id, guestSession.guest_id, app.id, bookingId]);
        await connection.commit();
        if (email) await deliverTurnosNotification({ turnosId: app.id, bookingId, customerId, eventCode: "booking_created", recipient: email, idempotencyKey: `booking:${bookingId}:created:customer`, subject: `${status === "confirmed" ? "Turno confirmado" : "Solicitud recibida"} · ${app.name}`, html: `<p>Hola ${name},</p><p>${status === "confirmed" ? "Tu turno está confirmado." : "Recibimos tu solicitud y está pendiente de confirmación."}</p><p><strong>${service.name}</strong><br>${starts.toLocaleString("es-AR")}</p><p><a href="${new URL(req.url).origin}/p/${app.slug}/reserva/${publicToken}">Ver mi reserva</a></p>`, text: `Reserva ${bookingNumber}: ${status === "confirmed" ? "confirmada" : "pendiente"}.` });
        const [owners] = await db.query("SELECT email FROM tags_businesses WHERE id=? AND email IS NOT NULL LIMIT 1", [app.business_id]);
        if (owners[0]?.email) await deliverTurnosNotification({ turnosId: app.id, bookingId, customerId, eventCode: "booking_created_owner", recipient: owners[0].email, idempotencyKey: `booking:${bookingId}:created:owner`, subject: `Nueva reserva · ${app.name}`, html: `<p>Nueva reserva de <strong>${name}</strong> para ${service.name}.</p><p>${starts.toLocaleString("es-AR")}</p>`, text: `Nueva reserva ${bookingNumber}.` });
        return Response.json({ ok: true, booking: { id: bookingId, bookingNumber, status, paymentStatus, depositRequired, depositAmount, token: publicToken, manageUrl: `/p/${app.slug}/reserva/${publicToken}` } }, { status: 201 });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("TURNOS PUBLIC BOOKING CREATE ERROR:", error);
        return Response.json({ ok: false, error: "No se pudo crear la reserva" }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
