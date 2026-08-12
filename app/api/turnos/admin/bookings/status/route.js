export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosAccess, turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { cleanText, jsonResponseError } from "@/app/modules/turnos/lib/turnosService";
import { deliverTurnosNotification } from "@/app/modules/turnos/lib/deliverTurnosNotification";

const TRANSITIONS = {
    pending: ["confirmed", "rejected", "cancelled"],
    confirmed: ["checked_in", "cancelled", "no_show"],
    checked_in: ["in_progress", "cancelled", "no_show"],
    in_progress: ["completed", "cancelled"],
    completed: [], rejected: [], cancelled: [], no_show: []
};

export async function PATCH(req) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const businessId = String(body.businessId || "");
    const turnosId = Number(body.turnosId || 0);
    const bookingId = Number(body.bookingId || 0);
    const nextStatus = String(body.status || "");
    const access = await getTurnosAccess({ businessId, turnosId, permission: "bookings.approve" });
    if (!access.allowed) return turnosAccessResponse(access);
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query(`SELECT b.*,c.email customer_email,c.name customer_name,s.name service_name,a.name app_name FROM tags_turnos_bookings b INNER JOIN tags_turnos_apps a ON a.id=b.turnos_id AND a.business_id=? INNER JOIN tags_turnos_customers c ON c.id=b.customer_id INNER JOIN tags_turnos_services s ON s.id=b.service_id WHERE b.id=? AND b.turnos_id=? LIMIT 1 FOR UPDATE`, [businessId, bookingId, turnosId]);
        const booking = rows[0];
        if (!booking) { await connection.rollback(); return jsonResponseError("Reserva no encontrada", 404); }
        if (!(TRANSITIONS[booking.status] || []).includes(nextStatus)) { await connection.rollback(); return jsonResponseError(`No se puede pasar de ${booking.status} a ${nextStatus}`); }
        await connection.query(`UPDATE tags_turnos_bookings SET status=?, confirmed_at=CASE WHEN ?='confirmed' THEN COALESCE(confirmed_at,NOW()) ELSE confirmed_at END, cancelled_at=CASE WHEN ? IN ('cancelled','rejected') THEN NOW() ELSE cancelled_at END, checked_in_at=CASE WHEN ?='checked_in' THEN NOW() ELSE checked_in_at END, started_at=CASE WHEN ?='in_progress' THEN NOW() ELSE started_at END, completed_at=CASE WHEN ?='completed' THEN NOW() ELSE completed_at END WHERE id=?`, [nextStatus, nextStatus, nextStatus, nextStatus, nextStatus, nextStatus, bookingId]);
        await connection.query("INSERT INTO tags_turnos_booking_status_history (booking_id,from_status,to_status,actor_type,actor_id,reason) VALUES (?,?,?,'owner',?,?)", [bookingId, booking.status, nextStatus, access.session?.userId || access.session?.id || null, cleanText(body.reason, 500) || "Actualizado desde la agenda"]);
        await connection.commit();
        if (booking.customer_email && ["confirmed","rejected","cancelled"].includes(nextStatus)) await deliverTurnosNotification({ turnosId, bookingId, customerId: booking.customer_id, eventCode: `booking_${nextStatus}`, recipient: booking.customer_email, idempotencyKey: `booking:${bookingId}:status:${nextStatus}`, subject: `${nextStatus === "confirmed" ? "Turno confirmado" : nextStatus === "rejected" ? "Solicitud no aceptada" : "Turno cancelado"} · ${booking.app_name}`, html: `<p>Hola ${booking.customer_name},</p><p>Tu reserva para <strong>${booking.service_name}</strong> está: ${nextStatus}.</p>`, text: `Estado de tu reserva: ${nextStatus}.` });
        return Response.json({ ok: true, status: nextStatus });
    } catch (error) {
        await connection.rollback();
        console.error("TURNOS BOOKING STATUS ERROR:", error);
        return Response.json({ ok: false, error: "No se pudo actualizar la reserva" }, { status: 500 });
    } finally { connection.release(); }
}
