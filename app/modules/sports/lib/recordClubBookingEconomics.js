import { parseJson } from "@/app/modules/turnos/lib/turnosService";

export async function recordClubBookingEconomics(connection, { turnosId, bookingId }) {
  const [rows] = await connection.query(`SELECT sa.id sports_app_id,b.price_snapshot,b.currency,b.payment_status,b.starts_at,s.id service_id,s.settings_json FROM tags_sports_apps sa INNER JOIN tags_turnos_bookings b ON b.turnos_id=sa.turnos_id INNER JOIN tags_turnos_services s ON s.id=b.service_id WHERE sa.turnos_id=? AND b.id=? LIMIT 1`, [turnosId, bookingId]);
  const booking = rows[0];
  if (!booking) return;
  const sports = parseJson(booking.settings_json, {}).sports || {};
  const [resources] = await connection.query(`SELECT r.id,rt.code FROM tags_turnos_booking_resources br INNER JOIN tags_turnos_resources r ON r.id=br.resource_id INNER JOIN tags_turnos_resource_types rt ON rt.id=r.resource_type_id WHERE br.booking_id=?`, [bookingId]);
  const court = resources.find(item => item.code === "court");
  if (!court) return;
  const coachResource = resources.find(item => item.code === "coach");
  let coach = null, rule = null, coachAmount = 0;
  if (coachResource) {
    const [[coachRow]] = await connection.query("SELECT id FROM tags_club_coaches WHERE sports_app_id=? AND resource_id=? AND status='active' LIMIT 1", [booking.sports_app_id, coachResource.id]);
    coach = coachRow || null;
    if (coach) {
      const [rules] = await connection.query(`SELECT * FROM tags_club_coach_commission_rules WHERE sports_app_id=? AND coach_id=? AND is_active=1 AND (service_id IS NULL OR service_id=?) AND valid_from<=DATE(?) AND (valid_until IS NULL OR valid_until>=DATE(?)) ORDER BY service_id IS NOT NULL DESC,valid_from DESC,id DESC LIMIT 1`, [booking.sports_app_id, coach.id, booking.service_id, booking.starts_at, booking.starts_at]);
      rule = rules[0] || null;
    }
  }
  const gross = Number(booking.price_snapshot || 0);
  if (rule) coachAmount = Math.max(0, gross * Number(rule.percentage || 0) / 100 + Number(rule.fixed_per_class || 0));
  coachAmount = Math.min(gross, coachAmount);
  await connection.query(`INSERT INTO tags_club_booking_economics (sports_app_id,booking_id,booking_kind,court_resource_id,coach_id,commission_rule_id,gross_amount,coach_amount,club_amount,currency,payment_status,occurred_at,snapshot_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE payment_status=VALUES(payment_status),updated_at=NOW()`, [booking.sports_app_id, bookingId, sports.activityKind === "class" ? "class" : "rental", court.id, coach?.id || null, rule?.id || null, gross, coachAmount, gross - coachAmount, booking.currency || "ARS", booking.payment_status || "pending", booking.starts_at, JSON.stringify({ commissionType: rule?.rule_type || null, percentage: rule?.percentage || null, fixedPerClass: rule?.fixed_per_class || null })]);
}
