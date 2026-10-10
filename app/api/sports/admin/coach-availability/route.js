export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getCoachScope } from "@/app/modules/sports/lib/getCoachScope";
import { turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

const validTime = value => /^\d{2}:\d{2}$/.test(String(value || ""));
const datePart = value => value ? String(value).slice(0, 10) : null;

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const scope = await getCoachScope({ businessId: Number(q.get("businessId")), turnosId: Number(q.get("turnosId")), permission: ["availability.view", "sports.coach.schedule.view"], coachId: Number(q.get("coachId") || 0) });
  if (!scope.access.allowed) return turnosAccessResponse(scope.access);
  if (!scope.coach) return Response.json({ ok: true, coach: null, grants: [], availability: [] });
  const [grants] = await db.query(`SELECT g.*,r.name court_name FROM tags_club_coach_court_grants g INNER JOIN tags_turnos_resources r ON r.id=g.court_resource_id WHERE g.sports_app_id=? AND g.coach_id=? AND g.is_active=1 ORDER BY g.weekday,g.start_time`, [scope.access.sportsApp.id, scope.coach.id]);
  const [availability] = await db.query(`SELECT a.*,r.name court_name FROM tags_club_coach_availability a INNER JOIN tags_turnos_resources r ON r.id=a.court_resource_id WHERE a.sports_app_id=? AND a.coach_id=? AND a.is_active=1 ORDER BY a.weekday,a.start_time`, [scope.access.sportsApp.id, scope.coach.id]);
  return Response.json({ ok: true, coach: scope.coach, grants, availability });
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return jsonResponseError("Datos inválidos");
  const turnosId = Number(body.turnosId), grantId = Number(body.grantId), weekday = Number(body.weekday);
  const scope = await getCoachScope({ businessId: Number(body.businessId), turnosId, permission: ["availability.manage", "sports.coach.schedule.manage"], coachId: Number(body.coachId || 0) });
  if (!scope.access.allowed) return turnosAccessResponse(scope.access);
  if (!scope.coach) return jsonResponseError("No hay un profesor asociado a este acceso", 403);
  if (weekday < 0 || weekday > 6 || !validTime(body.startTime) || !validTime(body.endTime) || body.endTime <= body.startTime) return jsonResponseError("Horario inválido");
  const validFrom = datePart(body.validFrom), validUntil = datePart(body.validUntil);
  const [[grant]] = await db.query(`SELECT * FROM tags_club_coach_court_grants WHERE id=? AND sports_app_id=? AND coach_id=? AND weekday=? AND is_active=1 AND start_time<=? AND end_time>=? AND (valid_from IS NULL OR ? IS NULL OR valid_from<=?) AND (valid_until IS NULL OR ? IS NULL OR valid_until>=?) LIMIT 1`, [grantId, scope.access.sportsApp.id, scope.coach.id, weekday, body.startTime, body.endTime, validFrom, validFrom, validUntil, validUntil]);
  if (!grant) return jsonResponseError("El horario debe estar dentro de una franja autorizada");
  const [conflicts] = await db.query(`SELECT a.id,c.display_name,r.name court_name FROM tags_club_coach_availability a INNER JOIN tags_club_coaches c ON c.id=a.coach_id INNER JOIN tags_turnos_resources r ON r.id=a.court_resource_id WHERE a.sports_app_id=? AND a.weekday=? AND a.is_active=1 AND (a.court_resource_id=? OR a.coach_id=?) AND a.start_time<? AND a.end_time>? AND (a.valid_until IS NULL OR ? IS NULL OR a.valid_until>=?) AND (? IS NULL OR a.valid_from IS NULL OR a.valid_from<=?) LIMIT 1`, [scope.access.sportsApp.id, weekday, grant.court_resource_id, scope.coach.id, body.endTime, body.startTime, validFrom, validFrom, validUntil, validUntil]);
  if (conflicts.length) return jsonResponseError(`Ese horario se superpone con ${conflicts[0].display_name} en ${conflicts[0].court_name}`);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rule] = await connection.query(`INSERT INTO tags_turnos_schedule_rules (turnos_id,scope_type,scope_id,weekday,start_time,end_time,slot_interval_minutes,valid_from,valid_until,is_active) VALUES (?,'resource',?,?,?,?,?,?,?,?,1)`, [turnosId, scope.coach.resource_id, weekday, body.startTime, body.endTime, Math.max(5, Number(body.slotIntervalMinutes || 60)), validFrom, validUntil]);
    const [result] = await connection.query(`INSERT INTO tags_club_coach_availability (sports_app_id,coach_id,grant_id,court_resource_id,weekday,start_time,end_time,valid_from,valid_until,slot_interval_minutes,schedule_rule_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [scope.access.sportsApp.id, scope.coach.id, grant.id, grant.court_resource_id, weekday, body.startTime, body.endTime, validFrom, validUntil, Math.max(5, Number(body.slotIntervalMinutes || 60)), rule.insertId]);
    await connection.commit();
    return Response.json({ ok: true, availabilityId: result.insertId }, { status: 201 });
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function DELETE(req) {
  const body = await req.json().catch(() => null);
  if (!body) return jsonResponseError("Datos inválidos");
  const scope = await getCoachScope({ businessId: Number(body.businessId), turnosId: Number(body.turnosId), permission: ["availability.manage", "sports.coach.schedule.manage"], coachId: Number(body.coachId || 0) });
  if (!scope.access.allowed) return turnosAccessResponse(scope.access);
  if (!scope.coach) return jsonResponseError("Profesor inválido", 403);
  const [[row]] = await db.query("SELECT id,schedule_rule_id FROM tags_club_coach_availability WHERE id=? AND sports_app_id=? AND coach_id=? LIMIT 1", [Number(body.availabilityId), scope.access.sportsApp.id, scope.coach.id]);
  if (!row) return jsonResponseError("Horario no encontrado", 404);
  const connection = await db.getConnection();
  try { await connection.beginTransaction(); await connection.query("UPDATE tags_club_coach_availability SET is_active=0 WHERE id=?", [row.id]); if (row.schedule_rule_id) await connection.query("UPDATE tags_turnos_schedule_rules SET is_active=0 WHERE id=? AND turnos_id=?", [row.schedule_rule_id, Number(body.turnosId)]); await connection.commit(); return Response.json({ ok: true }); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}
