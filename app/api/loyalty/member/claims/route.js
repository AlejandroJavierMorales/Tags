export const runtime="nodejs";
export const dynamic="force-dynamic";
import {db} from "@/app/lib/tags-db";
import {getSessionUser} from "@/app/modules/users/lib/userSession";
import {ensureLoyaltyMember} from "@/app/modules/loyalty/lib/loyaltyMemberService";
import {ensureAccount} from "@/app/modules/loyalty/lib/loyaltyProgramService";

export async function GET(){const session=await getSessionUser();if(!session)return Response.json({success:false,error:"No autenticado"},{status:401});const[rows]=await db.query(`SELECT c.id,c.claim_type,c.status,c.requested_amount,c.requested_notes,c.rejection_reason,c.created_at,c.reviewed_at,b.display_name business_name,p.name program_name,r.name reward_name FROM tags_loyalty_claims c INNER JOIN tags_loyalty_members lm ON lm.id=c.member_id INNER JOIN tags_businesses b ON b.id=c.business_id INNER JOIN tags_loyalty_programs p ON p.id=c.program_id LEFT JOIN tags_loyalty_rewards r ON r.id=c.reward_id WHERE lm.user_id=? ORDER BY c.created_at DESC LIMIT 50`,[session.userId]);return Response.json({success:true,claims:rows});}

export async function POST(request){
 const session=await getSessionUser();if(!session)return Response.json({success:false,error:"No autenticado"},{status:401});
 const body=await request.json().catch(()=>null),businessId=Number(body?.business_id||0),programId=Number(body?.program_id||0),claimType=body?.claim_type==="redemption"?"redemption":"accrual";
 if(!businessId||!programId)return Response.json({success:false,error:"Comercio o programa inválido"},{status:400});
 try{
  const merchantIdentifier=String(body?.merchant_identifier||"").trim().replace(/^tags-loyalty-business:/i,"");
  const [valid]=await db.query(`SELECT p.id,p.mechanic FROM tags_loyalty_programs p INNER JOIN tags_business_addons ba ON ba.business_id=p.business_id AND ba.addon_code='loyalty' AND ba.status='active' AND (ba.expires_at IS NULL OR ba.expires_at>=NOW()) INNER JOIN tags_loyalty_merchant_codes mc ON mc.business_id=p.business_id AND mc.program_id=p.id AND mc.status='active' AND mc.expires_at>NOW() AND (mc.access_code=? OR mc.qr_token=?) WHERE p.id=? AND p.business_id=? AND p.status='active' LIMIT 1`,[merchantIdentifier,merchantIdentifier,programId,businessId]);if(!valid[0])throw new Error("El código del comercio no es válido o ya venció");
  const member=await ensureLoyaltyMember(session.userId),account=await ensureAccount(programId,member.id);
  const [pending]=await db.query(`SELECT id FROM tags_loyalty_claims WHERE business_id=? AND member_id=? AND status='pending' AND expires_at>NOW() LIMIT 1`,[businessId,member.id]);if(pending[0])return Response.json({success:false,error:"Ya tenés una solicitud pendiente en este comercio"},{status:409});
  let rewardId=null;if(claimType==="redemption"){rewardId=Number(body?.reward_id||0);const[r]=await db.query(`SELECT id FROM tags_loyalty_rewards WHERE id=? AND program_id=? AND status='active' LIMIT 1`,[rewardId,programId]);if(!r[0])throw new Error("La recompensa no está disponible");}
  const[result]=await db.query(`INSERT INTO tags_loyalty_claims (business_id,program_id,member_id,account_id,claim_type,reward_id,status,requested_amount,requested_notes,expires_at) VALUES (?,?,?,?,?,?,'pending',?,?,DATE_ADD(NOW(),INTERVAL 24 HOUR))`,[businessId,programId,member.id,account.id,claimType,rewardId,body?.amount||null,String(body?.notes||"").trim()||null]);
  return Response.json({success:true,claimId:result.insertId});
 }catch(error){console.error("LOYALTY CLAIM CREATE ERROR",error);return Response.json({success:false,error:error.message||"No se pudo crear la solicitud"},{status:400});}
}
