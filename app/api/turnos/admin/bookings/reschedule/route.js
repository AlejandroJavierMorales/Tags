export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosAccess, turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { deliverTurnosNotification } from "@/app/modules/turnos/lib/deliverTurnosNotification";
import { jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

function minute(value) { const [hours, minutes] = String(value).split(":").map(Number); return hours * 60 + minutes; }

export async function PATCH(req) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const businessId = String(body.businessId || "");
    const turnosId = Number(body.turnosId || 0);
    const bookingId = Number(body.bookingId || 0);
    const starts = new Date(body.startsAt);
    const access = await getTurnosAccess({ businessId, turnosId, permission: "bookings.approve" });
    if (!access.allowed) return turnosAccessResponse(access);
    if (!bookingId || Number.isNaN(starts.getTime())) return jsonResponseError("Reserva u horario inválido");
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query(
            `SELECT b.*,s.name service_name,c.email customer_email,c.name customer_name,a.name app_name
             FROM tags_turnos_bookings b
             INNER JOIN tags_turnos_apps a ON a.id=b.turnos_id AND a.business_id=?
             INNER JOIN tags_turnos_services s ON s.id=b.service_id
             INNER JOIN tags_turnos_customers c ON c.id=b.customer_id
             WHERE b.id=? AND b.turnos_id=? LIMIT 1 FOR UPDATE`,
            [businessId, bookingId, turnosId]
        );
        const booking = rows[0];
        if (!booking || !["pending", "confirmed"].includes(booking.status)) {
            await connection.rollback();
            return jsonResponseError("La reserva no puede reprogramarse", 409);
        }
        const duration = new Date(booking.ends_at).getTime() - new Date(booking.starts_at).getTime();
        const ends = new Date(starts.getTime() + duration);
        const weekday = starts.getDay();
        const day = starts.toISOString().slice(0, 10);
        const from = starts.getHours() * 60 + starts.getMinutes();
        const to = ends.getHours() * 60 + ends.getMinutes();
        const [allocations] = await connection.query(
            `SELECT br.requirement_id,br.resource_id,br.units,r.capacity
             FROM tags_turnos_booking_resources br
             INNER JOIN tags_turnos_resources r ON r.id=br.resource_id
             WHERE br.booking_id=? FOR UPDATE`,
            [bookingId]
        );
        if (!allocations.length) { await connection.rollback(); return jsonResponseError("La reserva no tiene un recurso asignado", 409); }
        for (const allocation of allocations) {
            const [ownRules] = await connection.query("SELECT start_time,end_time,valid_from,valid_until FROM tags_turnos_schedule_rules WHERE turnos_id=? AND scope_type='resource' AND scope_id=? AND weekday=? AND is_active=1", [turnosId, allocation.resource_id, weekday]);
            const [generalRules] = ownRules.length ? [[]] : await connection.query("SELECT start_time,end_time,valid_from,valid_until FROM tags_turnos_schedule_rules WHERE turnos_id=? AND scope_type='app' AND weekday=? AND is_active=1", [turnosId, weekday]);
            const scheduled = (ownRules.length ? ownRules : generalRules).some(rule => (!rule.valid_from || day >= String(rule.valid_from).slice(0, 10)) && (!rule.valid_until || day <= String(rule.valid_until).slice(0, 10)) && from >= minute(rule.start_time) && to <= minute(rule.end_time));
            const [closed] = await connection.query("SELECT id FROM tags_turnos_schedule_exceptions WHERE turnos_id=? AND exception_type='closed' AND (scope_type='app' OR (scope_type='resource' AND scope_id=?)) AND starts_at<? AND ends_at>? LIMIT 1", [turnosId, allocation.resource_id, ends, starts]);
            const [usage] = await connection.query("SELECT COALESCE(SUM(COALESCE(br.units,1)),0) total FROM tags_turnos_booking_resources br INNER JOIN tags_turnos_bookings b ON b.id=br.booking_id WHERE br.resource_id=? AND b.id<>? AND b.status IN ('pending','confirmed','checked_in','in_progress') AND br.starts_at<? AND br.ends_at>?", [allocation.resource_id, bookingId, ends, starts]);
            if (!scheduled || closed.length || Number(usage[0]?.total || 0) + Number(allocation.units) > Number(allocation.capacity || 1)) {
                await connection.rollback();
                return jsonResponseError("El bloque seleccionado ya no está disponible", 409, "SLOT_CONFLICT");
            }
        }
        await connection.query("UPDATE tags_turnos_booking_resources SET starts_at=?,ends_at=? WHERE booking_id=?", [starts, ends, bookingId]);
        await connection.query("UPDATE tags_turnos_bookings SET starts_at=?,ends_at=?,updated_at=NOW() WHERE id=?", [starts, ends, bookingId]);
        await connection.query("INSERT INTO tags_turnos_booking_status_history (booking_id,from_status,to_status,actor_type,reason,metadata_json) VALUES (?,?,?,'owner','Reprogramada desde la agenda',?)", [bookingId, booking.status, booking.status, JSON.stringify({ previousStartsAt: booking.starts_at, newStartsAt: starts })]);
        await connection.commit();
        if (booking.customer_email) await deliverTurnosNotification({ turnosId, bookingId, customerId: booking.customer_id, eventCode: "booking_rescheduled", recipient: booking.customer_email, idempotencyKey: `booking:${bookingId}:rescheduled:${starts.toISOString()}`, subject: `Turno reprogramado · ${booking.app_name}`, html: `<p>Hola ${booking.customer_name}, tu turno para <strong>${booking.service_name}</strong> fue reprogramado.</p><p>${starts.toLocaleString("es-AR")}</p>`, text: `Nuevo horario: ${starts.toLocaleString("es-AR")}` });
        return Response.json({ ok: true });
    } catch (error) {
        await connection.rollback();
        console.error("TURNOS ADMIN RESCHEDULE ERROR:", error);
        return Response.json({ ok: false, error: "No se pudo reprogramar" }, { status: 500 });
    } finally { connection.release(); }
}
