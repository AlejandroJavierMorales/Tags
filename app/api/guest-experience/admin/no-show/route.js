export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";
import { sendBusinessPush } from "@/app/modules/notifications/server/sendBusinessPush";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

const ACTIONS = new Set(["credit", "retained", "refund"]);
const ACTION_LABELS = { credit: "La seña queda disponible como crédito", retained: "La seña será retenida por la no presentación", refund: "La seña será reintegrada" };
const money = (value, currency) => new Intl.NumberFormat("es-AR", { style: "currency", currency: currency || "ARS", maximumFractionDigits: 2 }).format(Number(value || 0));
const date = value => value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString("es-AR") : "";
const escapeHtml = value => String(value || "").replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[character]));

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const businessId=Number(body.businessId||0),guestAppId=Number(body.guestAppId||0),stayId=Number(body.stayId||0);
  const access=await getGuestAdminAccess({businessId,guestAppId,permission:"guest.stays.manage"});
  if(!access.allowed)return guestAdminAccessResponse(access);
  const financialAction=cleanGuestText(body.financialAction,30),reason=cleanGuestText(body.reason,2000);
  const totalAmount=Number(body.totalAmount),paidAmount=Number(body.paidAmount),pendingAmount=Number(body.pendingAmount);
  const creditExpiresAt=body.creditExpiresAt?String(body.creditExpiresAt).slice(0,10):null;
  const subject=cleanGuestText(body.subject,300),message=cleanGuestText(body.message,5000),notifyGuest=body.notifyGuest===true;
  if(!stayId||!ACTIONS.has(financialAction)||!reason)return guestError("Indicá el motivo y qué sucederá con la seña");
  if(![totalAmount,paidAmount,pendingAmount].every(Number.isFinite)||[totalAmount,paidAmount,pendingAmount].some(value=>value<0))return guestError("Los importes no son válidos");
  if(Math.abs(totalAmount-paidAmount-pendingAmount)>0.011)return guestError("El saldo pendiente debe ser igual al total menos el importe abonado");
  if(notifyGuest&&(!subject||!message))return guestError("Completá el asunto y el mensaje de la notificación");
  const connection=await db.getConnection();let stay;
  try{
    await connection.beginTransaction();
    const[rows]=await connection.query(`SELECT s.*,a.business_id,a.name app_name,a.logo_url,a.currency,g.id guest_id,g.name guest_name,g.email guest_email
      FROM tags_guest_stays s INNER JOIN tags_guest_apps a ON a.id=s.guest_app_id AND a.business_id=? INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id
      WHERE s.id=? AND s.guest_app_id=? LIMIT 1 FOR UPDATE`,[businessId,stayId,guestAppId]);
    stay=rows[0];if(!stay){await connection.rollback();return guestError("Reserva no encontrada",404)}
    if(!["reserved","upcoming"].includes(stay.status)){await connection.rollback();return guestError("Solo una reserva pendiente de ingreso puede marcarse como no presentada",409)}
    const[accounts]=await connection.query("SELECT id,currency FROM tags_guest_accounts WHERE stay_id=? AND guest_app_id=? LIMIT 1 FOR UPDATE",[stayId,guestAppId]);
    if(!accounts[0]){await connection.rollback();return guestError("La reserva no tiene una cuenta asociada",409)}
    const[[balanceRow]]=await connection.query("SELECT COALESCE(SUM(CASE WHEN status='confirmed' THEN total_amount ELSE 0 END),0) balance FROM tags_guest_account_entries WHERE account_id=?",[accounts[0].id]);
    const currentBalance=Number(balanceRow?.balance||0),adjustment=Number((pendingAmount-currentBalance).toFixed(2)),actorId=access.session?.id||access.session?.userId||null;
    if(Math.abs(adjustment)>0.009)await connection.query("INSERT INTO tags_guest_account_entries (account_id,entry_type,source_type,source_id,idempotency_key,description,quantity,unit_amount,total_amount,currency,status,metadata_json,created_by_type,created_by_id) VALUES (?,'adjustment','no_show',?,?,?,1,?,?,?,'confirmed',?,'owner',?)",[accounts[0].id,String(stayId),`no-show-adjustment:${stayId}`,`Ajuste por no presentación · ${reason}`,adjustment,adjustment,accounts[0].currency,JSON.stringify({previousBalance:currentBalance,targetBalance:pendingAmount,totalAmount,paidAmount,financialAction}),actorId]);
    await connection.query(`UPDATE tags_guest_stays SET status='no_show_rebooking',lodging_total=?,no_show_at=NOW(),no_show_by_id=?,no_show_reason=?,no_show_financial_action=?,no_show_credit_expires_at=?,no_show_total_amount=?,no_show_paid_amount=?,no_show_pending_amount=?,no_show_notification_subject=?,no_show_notification_message=?,updated_at=NOW() WHERE id=?`,[totalAmount,actorId,reason,financialAction,creditExpiresAt,totalAmount,paidAmount,pendingAmount,subject||null,message||null,stayId]);
    await connection.query("INSERT INTO tags_guest_audit_log (guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,'owner',?,'reservation.no_show','reservation',?,?)",[guestAppId,stayId,actorId,stayId,JSON.stringify({reason,financialAction,creditExpiresAt,totalAmount,paidAmount,pendingAmount,notifyGuest})]);
    await connection.commit();
  }catch(error){await connection.rollback();console.error("GUEST NO SHOW ERROR",error);return guestError(error?.code==="ER_BAD_FIELD_ERROR"?"Falta ejecutar la migración de No Show":"No se pudo marcar la reserva como no presentada",500)}finally{connection.release()}

  let notification={requested:notifyGuest,sent:false};
  if(notifyGuest){
    const recipient=stay.guest_email||"";let delivery={ok:false,error:"El huésped no tiene email"};
    const actionLabel=ACTION_LABELS[financialAction],deadline=creditExpiresAt?date(creditExpiresAt):"Sin fecha límite informada";
    if(recipient)delivery=await sendMail({to:recipient,subject,html:`<div style="max-width:620px;margin:auto;font-family:Arial,sans-serif;color:#183226;border:1px solid #dfe9e4;border-radius:18px;overflow:hidden"><div style="padding:22px;background:#fff6ec;text-align:center">${stay.logo_url?`<img src="${escapeHtml(stay.logo_url)}" alt="${escapeHtml(stay.app_name)}" style="max-width:150px;max-height:85px">`:""}<h1 style="font-size:22px">${escapeHtml(subject)}</h1></div><div style="padding:24px"><p>Hola <strong>${escapeHtml(stay.guest_name)}</strong>.</p><p style="white-space:pre-line">${escapeHtml(message)}</p><p><strong>Fechas originales:</strong> ${date(stay.starts_at)} al ${date(stay.ends_at)}<br><strong>Tratamiento de la seña:</strong> ${escapeHtml(actionLabel)}<br><strong>Fecha límite para reprogramar:</strong> ${escapeHtml(deadline)}<br><strong>Total:</strong> ${money(totalAmount,stay.currency)}<br><strong>Abonado:</strong> ${money(paidAmount,stay.currency)}<br><strong>Saldo pendiente:</strong> ${money(pendingAmount,stay.currency)}</p><p style="font-size:13px;color:#63746a">Contactanos para elegir una nueva fecha sujeta a disponibilidad.</p></div></div>`,text:`${subject}\n\nHola ${stay.guest_name}.\n${message}\n\nFechas originales: ${date(stay.starts_at)} al ${date(stay.ends_at)}\nTratamiento de la seña: ${actionLabel}\nFecha límite para reprogramar: ${deadline}\nTotal: ${money(totalAmount,stay.currency)}\nAbonado: ${money(paidAmount,stay.currency)}\nSaldo pendiente: ${money(pendingAmount,stay.currency)}\n\nContactanos para elegir una nueva fecha sujeta a disponibilidad.`});
    const status=delivery.ok?"sent":"failed";
    await db.query("INSERT INTO tags_guest_communications (guest_app_id,stay_id,guest_id,event_code,direction,channel,recipient,subject,message_text,payload_json,status,sent_at,failed_at,attempts,provider_reference,last_error,idempotency_key,created_by_type,created_by_id) VALUES (?,?,?,'no_show','outbound','email',?,?,?,?,?,IF(?='sent',NOW(),NULL),IF(?='failed',NOW(),NULL),1,?,?,?,'owner',?)",[guestAppId,stayId,stay.guest_id,recipient||null,subject,message,JSON.stringify({financialAction,totalAmount,paidAmount,pendingAmount,creditExpiresAt}),status,status,status,delivery.result?.id||null,delivery.error||null,`guest-no-show:${stayId}:${Date.now()}`,access.session?.id||access.session?.userId||null]);
    notification={requested:true,sent:delivery.ok,error:delivery.error||null};
    await sendBusinessPush({businessId,moduleCode:"guest_experience",eventCode:"guest_no_show",entityType:"stay",entityId:stayId,title:subject,body:message.slice(0,180),url:"inicio",idempotencyKey:`guest-no-show-push:${stayId}:${Date.now()}`,audience:"guest",recipientId:stay.guest_id}).catch(()=>{});
  }
  return Response.json({ok:true,status:"no_show_rebooking",notification});
}
