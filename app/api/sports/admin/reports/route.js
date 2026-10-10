export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getCoachScope } from "@/app/modules/sports/lib/getCoachScope";
import { turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";

const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const from = validDate(q.get("from")) ? q.get("from") : new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const until = validDate(q.get("until")) ? q.get("until") : new Date().toISOString().slice(0, 10);
  const scope = await getCoachScope({ businessId: Number(q.get("businessId")), turnosId: Number(q.get("turnosId")), permission: ["sports.finance.view", "sports.coach.finance.view"], coachId: Number(q.get("coachId") || 0) });
  if (!scope.access.allowed) return turnosAccessResponse(scope.access);
  const coachFilter = scope.access.isOwner ? Number(q.get("coachId") || 0) : Number(scope.coach?.id || -1);
  const params = [scope.access.sportsApp.id, `${from} 00:00:00`, `${until} 23:59:59`, coachFilter, coachFilter];
  const [rows] = await db.query(`SELECT e.*,b.booking_number,b.status booking_status,b.payment_status,b.starts_at,s.name service_name,cu.name customer_name,r.name court_name,c.display_name coach_name FROM tags_club_booking_economics e INNER JOIN tags_turnos_bookings b ON b.id=e.booking_id INNER JOIN tags_turnos_services s ON s.id=b.service_id INNER JOIN tags_turnos_customers cu ON cu.id=b.customer_id INNER JOIN tags_turnos_resources r ON r.id=e.court_resource_id LEFT JOIN tags_club_coaches c ON c.id=e.coach_id WHERE e.sports_app_id=? AND e.occurred_at BETWEEN ? AND ? AND (?=0 OR e.coach_id=?) ORDER BY e.occurred_at DESC`, params);
  const totals = rows.reduce((out, row) => { out.bookings += 1; out.gross += Number(row.gross_amount || 0); out.coaches += Number(row.coach_amount || 0); out.club += Number(row.club_amount || 0); if (row.booking_kind === "class") out.classes += 1; else out.rentals += 1; return out; }, { bookings: 0, rentals: 0, classes: 0, gross: 0, coaches: 0, club: 0 });
  const byCourt = Object.values(rows.reduce((out, row) => { const key = String(row.court_resource_id); out[key] ||= { id: row.court_resource_id, name: row.court_name, bookings: 0, gross: 0 }; out[key].bookings += 1; out[key].gross += Number(row.gross_amount || 0); return out; }, {}));
  return Response.json({ ok: true, from, until, totals, byCourt, rows, coach: scope.coach || null, canManage: scope.access.isOwner || scope.access.permissions?.includes("sports.finance.manage") });
}
