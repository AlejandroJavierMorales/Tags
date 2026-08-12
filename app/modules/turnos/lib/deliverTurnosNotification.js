import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";

export async function deliverTurnosNotification({ turnosId, bookingId = null, customerId = null, eventCode, recipient, subject, html, text, idempotencyKey, payload = {} }) {
    if (!turnosId || !eventCode || !recipient || !idempotencyKey) return { ok: false, skipped: true };
    try {
        const [result] = await db.query(`INSERT IGNORE INTO tags_turnos_notification_deliveries (turnos_id,booking_id,customer_id,event_code,channel,recipient,status,payload_json,scheduled_at,idempotency_key) VALUES (?,?,?,?,'email',?,'pending',?,NOW(),?)`, [turnosId, bookingId, customerId, eventCode, recipient, JSON.stringify(payload), idempotencyKey]);
        if (!result.affectedRows) return { ok: true, duplicate: true };
        const deliveryId = result.insertId;
        const delivery = await sendMail({ to: recipient, subject, html, text });
        if (delivery.ok) {
            await db.query("UPDATE tags_turnos_notification_deliveries SET status='sent',sent_at=NOW(),attempts=attempts+1,provider_reference=? WHERE id=?", [String(delivery.result?.id || "") || null, deliveryId]);
        } else {
            await db.query("UPDATE tags_turnos_notification_deliveries SET status='failed',failed_at=NOW(),attempts=attempts+1,last_error=? WHERE id=?", [String(delivery.error || "Error de envío").slice(0, 500), deliveryId]);
        }
        return delivery;
    } catch (error) {
        console.error("TURNOS NOTIFICATION DELIVERY ERROR:", error);
        return { ok: false, error: error.message };
    }
}
