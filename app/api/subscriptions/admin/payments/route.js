export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireSubscriptionAdmin, subscriptionAdminError } from "@/app/modules/subscriptions/lib/requireSubscriptionAdmin";
import { recordManualSubscriptionCoverage } from "@/app/modules/subscriptions/lib/subscriptionActivationService";

export async function POST(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  const body = await req.json().catch(() => null);
  const subscriptionId = Number(body?.subscriptionId || 0);
  const amount = Number(body?.amount);
  if (!subscriptionId || !Number.isFinite(amount) || amount <= 0) return Response.json({ ok:false,error:"Suscripción e importe son obligatorios" },{status:400});
  try {
    const result = await recordManualSubscriptionCoverage({ subscriptionId, provider: String(body?.provider || "manual"), amount, paidAt: body?.paidAt, periodStart: body?.periodStart, periodEnd: body?.periodEnd, notes: String(body?.notes || "Pago manual imputado por administración"), actorId:Number(access.session?.businessId || 0) || null });
    return Response.json({ ok:true, ...result });
  } catch (error) {
    console.error("SUBSCRIPTION PAYMENT CREATE ERROR",error);
    return Response.json({ok:false,error:error?.message||"No se pudo imputar el pago"},{status:Number(error?.status || 500)});
  }
}

export async function PUT(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  const body = await req.json().catch(() => null);
  const id = Number(body?.id || 0), amount = Number(body?.amount);
  const status = String(body?.status || "approved");
  if (!id || !Number.isFinite(amount) || amount < 0 || !["pending","approved","rejected","cancelled"].includes(status)) return Response.json({ok:false,error:"Datos del pago inválidos"},{status:400});
  const [[previous]]=await db.query("SELECT * FROM tags_subscription_payments WHERE id=? LIMIT 1",[id]);
  const [result] = await db.query("UPDATE tags_subscription_payments SET amount=?,provider=?,status=?,paid_at=IF(?='approved',COALESCE(paid_at,NOW()),paid_at),notes=? WHERE id=?",[amount,String(body?.provider||"manual"),status,status,String(body?.notes||"").trim()||null,id]);
  if (!result.affectedRows) return Response.json({ok:false,error:"Pago inexistente"},{status:404});
  await db.query("INSERT INTO tags_subscription_audit_events (subscription_id,business_id,event_code,actor_type,actor_id,previous_state_json,next_state_json) VALUES (?,?,'payment.updated','admin',?,?,?)",[previous.subscription_id,previous.business_id,Number(access.session?.businessId||0)||null,JSON.stringify(previous),JSON.stringify({amount,provider:body?.provider||"manual",status,notes:body?.notes||null})]);
  return Response.json({ok:true});
}

export async function DELETE(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  const id = Number(new URL(req.url).searchParams.get("id") || 0);
  if (!id) return Response.json({ok:false,error:"Falta el pago"},{status:400});
  const [[previous]]=await db.query("SELECT * FROM tags_subscription_payments WHERE id=? LIMIT 1",[id]);
  const [result] = await db.query("DELETE FROM tags_subscription_payments WHERE id=?",[id]);
  if (!result.affectedRows) return Response.json({ok:false,error:"Pago inexistente"},{status:404});
  await db.query("INSERT INTO tags_subscription_audit_events (subscription_id,business_id,event_code,actor_type,actor_id,previous_state_json) VALUES (?,?,'payment.deleted','admin',?,?)",[previous.subscription_id,previous.business_id,Number(access.session?.businessId||0)||null,JSON.stringify(previous)]);
  return Response.json({ok:true});
}
