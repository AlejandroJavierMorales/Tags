export const runtime="nodejs";
export const dynamic="force-dynamic";
import {db} from "@/app/lib/tags-db";
import {getLoyaltyAdminScope,loyaltyApiError} from "@/app/modules/loyalty/lib/loyaltyAdminScope";
import {requireActiveLoyaltyAddon} from "@/app/modules/loyalty/lib/loyaltyAccess";
import {postLoyaltyTransaction} from "@/app/modules/loyalty/lib/loyaltyLedgerService";
import {redeemLoyaltyReward} from "@/app/modules/loyalty/lib/loyaltyRedemptionService";

export async function GET(request){try{const requested=new URL(request.url).searchParams.get("business_id"),{businessId}=await getLoyaltyAdminScope(requested);await requireActiveLoyaltyAddon(businessId);await db.query(`UPDATE tags_loyalty_claims SET status='expired',updated_at=NOW() WHERE business_id=? AND status='pending' AND expires_at<=NOW()`,[businessId]);const[rows]=await db.query(`SELECT c.*,u.first_name,u.last_name,u.display_name,u.email,p.name program_name,p.mechanic,r.name reward_name FROM tags_loyalty_claims c INNER JOIN tags_loyalty_members lm ON lm.id=c.member_id INNER JOIN tags_users u ON u.id=lm.user_id INNER JOIN tags_loyalty_programs p ON p.id=c.program_id LEFT JOIN tags_loyalty_rewards r ON r.id=c.reward_id WHERE c.business_id=? ORDER BY FIELD(c.status,'pending','confirmed','rejected','expired'),c.created_at DESC LIMIT 100`,[businessId]);return Response.json({success:true,claims:rows});}catch(error){return loyaltyApiError(error)}}

export async function PATCH(request){
 try{
  const body=await request.json().catch(()=>null),id=Number(body?.id||0),action=String(body?.action||"");const{businessId,session}=await getLoyaltyAdminScope(body?.business_id);await requireActiveLoyaltyAddon(businessId);
  const[rows]=await db.query(`SELECT c.*,p.mechanic FROM tags_loyalty_claims c INNER JOIN tags_loyalty_programs p ON p.id=c.program_id WHERE c.id=? AND c.business_id=? LIMIT 1`,[id,businessId]);const claim=rows[0];if(!claim)throw new Error("Solicitud no encontrada");if(claim.status!=="pending")throw new Error("La solicitud ya fue procesada");if(new Date(claim.expires_at)<=new Date()){await db.query(`UPDATE tags_loyalty_claims SET status='expired',updated_at=NOW() WHERE id=?`,[id]);throw new Error("La solicitud venció");}
  if(action==="reject"){await db.query(`UPDATE tags_loyalty_claims SET status='rejected',rejection_reason=?,reviewed_by_user_id=?,reviewed_at=NOW(),updated_at=NOW() WHERE id=? AND status='pending'`,[String(body?.reason||"").trim()||"Rechazada por el comercio",session?.userId||null,id]);return Response.json({success:true});}
  if(action!=="approve")throw new Error("Acción inválida");
  if(claim.claim_type==="redemption"){
   const result=await redeemLoyaltyReward({businessId,rewardId:claim.reward_id,accountId:claim.account_id,performedByUserId:session?.userId||null,notes:claim.requested_notes||"Solicitud iniciada por el usuario"});
   await db.query(`UPDATE tags_loyalty_claims SET status='confirmed',transaction_id=?,redemption_id=?,reviewed_by_user_id=?,reviewed_at=NOW(),updated_at=NOW() WHERE id=? AND status='pending'`,[result.transactionId,result.redemptionId,session?.userId||null,id]);
  }else{
   const points=claim.mechanic==="points"?Number(body?.points||0):0,stamps=claim.mechanic==="stamps"?Number(body?.stamps||1):0,visits=claim.mechanic==="visits"?Number(body?.visits||1):0;if(points<1&&stamps<1&&visits<1)throw new Error("Indicá la cantidad a acreditar");
   const tx=await postLoyaltyTransaction({businessId,accountId:claim.account_id,transactionType:claim.mechanic==="points"?"CREDIT_POINTS":claim.mechanic==="stamps"?"ADD_STAMP":"ADD_VISIT",pointsDelta:points,stampsDelta:stamps,visitsDelta:visits,amount:claim.requested_amount,source:"qr",referenceType:"loyalty_claim",referenceId:String(claim.id),description:claim.requested_notes||"Solicitud iniciada por el usuario",performedByUserId:session?.userId||null,idempotencyKey:`loyalty-claim-${claim.id}`,metadata:{claimId:claim.id}});
   await db.query(`UPDATE tags_loyalty_claims SET status='confirmed',approved_points=?,approved_stamps=?,approved_visits=?,transaction_id=?,reviewed_by_user_id=?,reviewed_at=NOW(),updated_at=NOW() WHERE id=? AND status='pending'`,[points,stamps,visits,tx.id,session?.userId||null,id]);
  }
  return Response.json({success:true});
 }catch(error){console.error("LOYALTY CLAIM REVIEW ERROR",error);return loyaltyApiError(error)}
}
