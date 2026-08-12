export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { hashToken, jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const params = new URL(req.url).searchParams;
    const slug = String(params.get("slug") || "");
    const token = String(params.get("token") || "");
    if (!slug || !token) return jsonResponseError("Enlace de reserva inválido");
    const [rows] = await db.query(
        `SELECT b.id,b.booking_number,b.status,b.starts_at,b.ends_at,b.party_size,
                b.payment_status,b.deposit_required,b.deposit_amount,b.customer_notes,
                s.name service_name,s.duration_minutes,a.name app_name,a.slug,
                business.name business_name,business.display_name business_display_name,
                business.logo_url business_logo_url,c.name customer_name,c.email customer_email,c.phone customer_phone,
                (SELECT GROUP_CONCAT(DISTINCT r.name ORDER BY r.name SEPARATOR ', ')
                   FROM tags_turnos_booking_resources br
                   INNER JOIN tags_turnos_resources r ON r.id=br.resource_id
                  WHERE br.booking_id=b.id) resource_names,
                (SELECT COALESCE(MAX(r.capacity),1)
                   FROM tags_turnos_booking_resources br
                   INNER JOIN tags_turnos_resources r ON r.id=br.resource_id
                  WHERE br.booking_id=b.id) resource_capacity,
                (SELECT COALESCE(SUM(br.units),0)
                   FROM tags_turnos_booking_resources br
                  WHERE br.booking_id=b.id) reserved_units
           FROM tags_turnos_bookings b
           INNER JOIN tags_turnos_apps a ON a.id=b.turnos_id
           INNER JOIN tags_businesses business ON business.id=a.business_id
           INNER JOIN tags_turnos_services s ON s.id=b.service_id
           INNER JOIN tags_turnos_customers c ON c.id=b.customer_id
          WHERE a.slug=? AND b.public_token_hash=?
          LIMIT 1`,
        [slug, hashToken(token)]
    );
    if (!rows[0]) return jsonResponseError("Reserva no encontrada", 404, "BOOKING_NOT_FOUND");
    return Response.json({ ok: true, booking: rows[0] });
}
