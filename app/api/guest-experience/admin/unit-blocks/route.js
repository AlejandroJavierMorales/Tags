export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { parseLodgingDateInput } from "@/app/modules/guest-experience/lib/lodgingReservationRules";
import { findBlockingUnitBlock, findStayConflictingWithBlock, lockActiveGuestUnit, lockGuestInventory } from "@/app/modules/guest-experience/server/lodgingAvailabilityService";

const BLOCK_TYPES = new Set(["manual", "maintenance", "owner_use", "out_of_service"]);

function context(body = {}) {
 return { businessId:Number(body.businessId||0),guestAppId:Number(body.guestAppId||0) };
}

export async function GET(req) {
 const params=Object.fromEntries(new URL(req.url).searchParams),{businessId,guestAppId}=context(params);
 const access=await getGuestAdminAccess({businessId,guestAppId});
 if(!access.allowed)return guestAdminAccessResponse(access);
 const [blocks]=await db.query(`SELECT b.*,u.name unit_name,u.code unit_code
   FROM tags_guest_unit_blocks b
   LEFT JOIN tags_guest_units u ON u.id=b.unit_id AND u.guest_app_id=b.guest_app_id
  WHERE b.guest_app_id=?
  ORDER BY FIELD(b.status,'active','cancelled'),b.starts_on,b.id`,[guestAppId]);
 return Response.json({ok:true,blocks});
}

export async function POST(req) {
 const body=await req.json().catch(()=>null);if(!body)return guestError("Cuerpo JSON inválido");
 const {businessId,guestAppId}=context(body),access=await getGuestAdminAccess({businessId,guestAppId});
 if(!access.allowed)return guestAdminAccessResponse(access);
 const scopeType=body.scopeType==="property"?"property":"unit",unitId=scopeType==="unit"?Number(body.unitId||0):0;
 const starts=parseLodgingDateInput(body.startsOn),ends=parseLodgingDateInput(body.endsOn);
 if(!starts||!ends||ends<=starts)return guestError("Definí un período válido; la fecha final debe ser posterior a la inicial");
 const blockType=BLOCK_TYPES.has(body.blockType)?body.blockType:"manual",reason=cleanGuestText(body.reason,1000);
 if(!reason)return guestError("Indicá el motivo del bloqueo");
 if(scopeType==="unit"&&!unitId)return guestError("Seleccioná una unidad");
 const connection=await db.getConnection();
 try{
  await connection.beginTransaction();
  const app=await lockGuestInventory(connection,{guestAppId,businessId});if(!app){await connection.rollback();return guestError("Instancia no encontrada",404)}
  if(scopeType==="unit"&&!await lockActiveGuestUnit(connection,{guestAppId,unitId})){await connection.rollback();return guestError("Unidad no encontrada",404)}
  const conflictingStay=await findStayConflictingWithBlock(connection,{guestAppId,unitId,startsAt:starts,endsAt:ends});
  if(conflictingStay){await connection.rollback();return guestError(`El bloqueo se superpone con la reserva ${conflictingStay.stay_code}. Reprogramá o cancelá esa reserva antes de bloquear.`,409,"BLOCK_CONFLICTS_WITH_STAY")}
  const unitIds=scopeType==="property"?(await connection.query("SELECT id FROM tags_guest_units WHERE guest_app_id=? AND is_active=1 FOR UPDATE",[guestAppId]))[0].map(item=>item.id):[unitId];
  for(const candidateUnitId of unitIds){const overlap=await findBlockingUnitBlock(connection,{guestAppId,unitId:candidateUnitId,startsAt:starts,endsAt:ends});if(overlap){await connection.rollback();return guestError("Ya existe un bloqueo activo que se superpone con ese período",409,"BLOCK_OVERLAP")}}
  const idempotencyKey=cleanGuestText(body.idempotencyKey,190)||null;
  const [result]=await connection.query(`INSERT INTO tags_guest_unit_blocks
   (guest_app_id,scope_type,unit_id,starts_on,ends_on,block_type,reason,status,idempotency_key,created_by_id)
   VALUES (?,?,?,?,?,?,?,'active',?,?)`,[guestAppId,scopeType,scopeType==="unit"?unitId:null,body.startsOn,body.endsOn,blockType,reason,idempotencyKey,Number(access.session?.userId||access.session?.id||0)||null]);
  await connection.query("INSERT INTO tags_guest_audit_log (guest_app_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,'owner',?,'inventory_block.created','unit_block',?,?)",[guestAppId,access.session?.id||access.session?.userId||null,result.insertId,JSON.stringify({scopeType,unitId:scopeType==="unit"?unitId:null,startsOn:body.startsOn,endsOn:body.endsOn,blockType,reason})]);
  await connection.commit();return Response.json({ok:true,blockId:result.insertId},{status:201});
 }catch(error){await connection.rollback();if(error?.code==="ER_DUP_ENTRY")return guestError("Ese bloqueo ya fue registrado",409,"DUPLICATE_BLOCK");console.error("GUEST UNIT BLOCK POST ERROR",error);return guestError("No se pudo crear el bloqueo",500)}finally{connection.release()}
}

export async function DELETE(req) {
 const body=await req.json().catch(()=>null);if(!body)return guestError("Cuerpo JSON inválido");
 const {businessId,guestAppId}=context(body),blockId=Number(body.blockId||0),access=await getGuestAdminAccess({businessId,guestAppId});
 if(!access.allowed)return guestAdminAccessResponse(access);
 if(!blockId)return guestError("Bloqueo inválido");
 const reason=cleanGuestText(body.reason,1000)||"Cancelación manual desde la administración",actorId=Number(access.session?.userId||access.session?.id||0)||null;
 const connection=await db.getConnection();
 try{await connection.beginTransaction();const app=await lockGuestInventory(connection,{guestAppId,businessId});if(!app){await connection.rollback();return guestError("Instancia no encontrada",404)}
  const [rows]=await connection.query("SELECT id,scope_type,unit_id,starts_on,ends_on,block_type,reason,status FROM tags_guest_unit_blocks WHERE id=? AND guest_app_id=? LIMIT 1 FOR UPDATE",[blockId,guestAppId]);
  const block=rows[0];if(!block||block.status!=="active"){await connection.rollback();return guestError("El bloqueo no existe o ya estaba cancelado",404)}
  await connection.query(`UPDATE tags_guest_unit_blocks SET status='cancelled',cancelled_at=NOW(),cancelled_by_id=?,cancellation_reason=?,updated_at=NOW() WHERE id=?`,[actorId,reason,blockId]);
  await connection.query("INSERT INTO tags_guest_audit_log (guest_app_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,'owner',?,'inventory_block.cancelled','unit_block',?,?)",[guestAppId,actorId,blockId,JSON.stringify({reason,scopeType:block.scope_type,unitId:block.unit_id,startsOn:block.starts_on,endsOn:block.ends_on,blockType:block.block_type})]);
  await connection.commit();return Response.json({ok:true});
 }catch(error){await connection.rollback();console.error("GUEST UNIT BLOCK DELETE ERROR",error);return guestError("No se pudo levantar el bloqueo",500)}finally{connection.release()}
}
