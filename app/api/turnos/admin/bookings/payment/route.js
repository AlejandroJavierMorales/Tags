export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosAccess, turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { jsonResponseError, parseJson } from "@/app/modules/turnos/lib/turnosService";

export async function POST(req) {
    let body;
    try { body = await req.json(); } catch { return jsonResponseError("Cuerpo JSON inválido"); }
    const businessId = String(body?.businessId || "");
    const bookingId = Number(body?.bookingId || 0);
    const access = await getTurnosAccess({ businessId, permission: "bookings.approve" });
    if (!access.allowed) return turnosAccessResponse(access);
    if (!bookingId) return jsonResponseError("bookingId es requerido");
    const [rows] = await db.query(`SELECT b.*, a.deposit_policy_json FROM tags_turnos_bookings b INNER JOIN tags_turnos_apps a ON a.id = b.turnos_id AND a.business_id = ? WHERE b.id = ? LIMIT 1`, [businessId, bookingId]);
    const booking = rows[0];
    if (!booking) return jsonResponseError("Reserva no encontrada", 404, "BOOKING_NOT_FOUND");
    const paid = body?.paid !== false;
    const policy = parseJson(booking.payment_policy_snapshot_json, parseJson(booking.deposit_policy_json));
    const nextStatus = paid && booking.status === "pending" && policy.confirmAfterPayment ? "confirmed" : booking.status;
    await db.query("UPDATE tags_turnos_bookings SET payment_status = ?, status = ?, confirmed_at = CASE WHEN ? = 'confirmed' THEN COALESCE(confirmed_at, NOW()) ELSE confirmed_at END, updated_at = NOW() WHERE id = ?", [paid ? "paid" : "failed", nextStatus, nextStatus, bookingId]);
    await db.query("INSERT INTO tags_turnos_booking_status_history (booking_id, from_status, to_status, actor_type, reason) VALUES (?, ?, ?, 'owner', ?)", [bookingId, booking.status, nextStatus, paid ? "Seña registrada manualmente" : "Seña marcada como fallida"]);
    return Response.json({ ok: true, paymentStatus: paid ? "paid" : "failed", status: nextStatus });
}

