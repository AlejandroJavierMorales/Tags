export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSportsAccess } from "@/app/modules/sports/lib/getSportsAccess";
import { turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
  const q=new URL(req.url).searchParams,businessId=Number(q.get("businessId")||0),turnosId=Number(q.get("turnosId")||0);
  const access=await getSportsAccess({businessId,turnosId,permission:["resources.view","sports.coach.schedule.view"]});
  if(!access.allowed)return turnosAccessResponse(access);
  const [coaches]=await db.query(`SELECT c.*,st.email,st.phone,r.name resource_name,
    (SELECT GROUP_CONCAT(DISTINCT d.name ORDER BY d.name SEPARATOR ', ') FROM tags_sports_resource_disciplines rd INNER JOIN tags_sports_disciplines d ON d.id=rd.discipline_id WHERE rd.sports_app_id=c.sports_app_id AND rd.resource_id=c.resource_id) disciplines
    FROM tags_club_coaches c INNER JOIN tags_business_staff st ON st.id=c.staff_id INNER JOIN tags_turnos_resources r ON r.id=c.resource_id
    WHERE c.sports_app_id=? ORDER BY c.status='active' DESC,c.display_name`,[access.sportsApp.id]);
  const [courts]=await db.query(`SELECT r.id,r.name FROM tags_turnos_resources r INNER JOIN tags_turnos_resource_types rt ON rt.id=r.resource_type_id AND rt.code='court' WHERE r.turnos_id=? AND r.is_active=1 ORDER BY r.name`,[turnosId]);
  const [resources]=await db.query(`SELECT r.id,r.name FROM tags_turnos_resources r INNER JOIN tags_turnos_resource_types rt ON rt.id=r.resource_type_id AND rt.code='coach' WHERE r.turnos_id=? AND r.is_active=1 ORDER BY r.name`,[turnosId]);
  const [staff]=await db.query(`SELECT st.id,st.name,st.email FROM tags_business_staff st INNER JOIN tags_business_staff_app_access aa ON aa.staff_id=st.id AND aa.business_id=st.business_id AND aa.app_code='club' AND aa.status='active' WHERE st.business_id=? AND st.status='active' ORDER BY st.name`,[businessId]);
  return Response.json({ok:true,coaches,courts,resources,staff});
}

export async function POST(req) {
  const body=await req.json().catch(()=>null);if(!body)return jsonResponseError("Datos inválidos");
  const businessId=Number(body.businessId||0),turnosId=Number(body.turnosId||0),staffId=Number(body.staffId||0),resourceId=Number(body.resourceId||0);
  const access=await getSportsAccess({businessId,turnosId,permission:"resources.manage"});if(!access.allowed)return turnosAccessResponse(access);
  const [[staff],[resource]]=await Promise.all([
    db.query("SELECT id,name FROM tags_business_staff WHERE id=? AND business_id=? AND status='active' LIMIT 1",[staffId,businessId]).then(([r])=>r),
    db.query(`SELECT r.id FROM tags_turnos_resources r INNER JOIN tags_turnos_resource_types rt ON rt.id=r.resource_type_id AND rt.code='coach' WHERE r.id=? AND r.turnos_id=? AND r.is_active=1 LIMIT 1`,[resourceId,turnosId]).then(([r])=>r)
  ]);
  if(!staff||!resource)return jsonResponseError("Seleccioná un colaborador y un recurso profesor válidos");
  await db.query(`INSERT INTO tags_club_coaches (sports_app_id,business_id,staff_id,resource_id,display_name,status) VALUES (?,?,?,?,?,'active') ON DUPLICATE KEY UPDATE staff_id=VALUES(staff_id),resource_id=VALUES(resource_id),display_name=VALUES(display_name),status='active',updated_at=NOW()`,[access.sportsApp.id,businessId,staffId,resourceId,String(body.displayName||staff.name).trim().slice(0,190)]);
  return Response.json({ok:true});
}

export async function PATCH(req){const body=await req.json().catch(()=>null);if(!body)return jsonResponseError("Datos inválidos");const businessId=Number(body.businessId||0),turnosId=Number(body.turnosId||0),coachId=Number(body.coachId||0);const access=await getSportsAccess({businessId,turnosId,permission:"resources.manage"});if(!access.allowed)return turnosAccessResponse(access);await db.query("UPDATE tags_club_coaches SET status=?,updated_at=NOW() WHERE id=? AND sports_app_id=?",[body.status==="active"?"active":"inactive",coachId,access.sportsApp.id]);return Response.json({ok:true})}
