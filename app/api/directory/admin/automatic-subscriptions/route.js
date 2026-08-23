import { db } from "@/app/lib/tags-db";
import { requireDirectoryAdmin, directoryAdminError } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { directoryMercadoPagoBaseUrl, ensureDirectoryMercadoPagoSubscription, getDirectoryMercadoPagoPreapproval } from "@/app/modules/directory/lib/directoryMercadoPago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const { searchParams } = new URL(req.url);
  const search = String(searchParams.get("search") || "").trim().slice(0,120);
  const status = String(searchParams.get("status") || "all");
  const page = Math.max(1,Number(searchParams.get("page") || 1));
  const pageSize = 20;
  const conditions = ["s.payment_provider='mercadopago'","p.code IN ('directory_web','directory_web_plus')"];
  const params = [];
  if (search) { conditions.push("(b.name LIKE ? OR b.email LIKE ? OR s.external_subscription_id LIKE ?)"); const value=`%${search}%`;params.push(value,value,value); }
  if (status !== "all") { conditions.push("COALESCE(s.provider_status,'pending')=?"); params.push(status); }
  const where = conditions.join(" AND ");
  const [[count]] = await db.query(`SELECT COUNT(*) total FROM tags_subscriptions s INNER JOIN tags_businesses b ON b.id=s.business_id INNER JOIN tags_plans p ON p.id=s.plan_id WHERE ${where}`,params);
  const [rows] = await db.query(`SELECT s.id subscription_id,s.status local_status,s.provider_status,s.external_subscription_id,s.provider_init_point,s.provider_next_payment_at,s.provider_last_synced_at,s.amount,s.currency,s.expires_at,s.created_at,b.id business_id,b.name business_name,b.email,p.name plan_name,(SELECT ds.name FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id WHERE l.business_id=b.id ORDER BY ds.id LIMIT 1) site_name,(SELECT MAX(pay.paid_at) FROM tags_subscription_payments pay WHERE pay.subscription_id=s.id AND pay.provider='mercadopago' AND pay.status='approved') last_paid_at,(SELECT COUNT(*) FROM tags_subscription_payments pay WHERE pay.subscription_id=s.id AND pay.provider='mercadopago' AND pay.status='approved') approved_payments,(SELECT COUNT(*) FROM tags_subscription_payments pay WHERE pay.subscription_id=s.id AND pay.provider='mercadopago' AND pay.status='rejected') rejected_payments FROM tags_subscriptions s INNER JOIN tags_businesses b ON b.id=s.business_id INNER JOIN tags_plans p ON p.id=s.plan_id WHERE ${where} ORDER BY COALESCE(s.provider_next_payment_at,s.created_at) DESC LIMIT ? OFFSET ?`,[...params,pageSize,(page-1)*pageSize]);
  const [summary] = await db.query(`SELECT COUNT(*) total,SUM(provider_status='authorized') authorized,SUM(provider_status='pending' OR provider_status IS NULL) pending,SUM(provider_status='paused') paused,SUM(provider_status IN ('cancelled','canceled')) cancelled FROM tags_subscriptions s INNER JOIN tags_plans p ON p.id=s.plan_id WHERE s.payment_provider='mercadopago' AND p.code IN ('directory_web','directory_web_plus')`);
  return Response.json({ok:true,subscriptions:rows,kpis:summary[0] || {},page,pageSize,total:Number(count?.total || 0)});
}

export async function POST(req) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const body = await req.json().catch(()=>null);
  const subscriptionId = Number(body?.subscriptionId || 0);
  const action = String(body?.action || "sync");
  if (!subscriptionId || !["sync","retry"].includes(action)) return Response.json({error:"Acción inválida"},{status:400});
  try {
    if (action === "retry") {
      const result = await ensureDirectoryMercadoPagoSubscription({subscriptionId,baseUrl:directoryMercadoPagoBaseUrl(req)});
      return Response.json({ok:true,checkoutUrl:result.init_point || null});
    }
    const [[subscription]] = await db.query("SELECT external_subscription_id FROM tags_subscriptions WHERE id=? AND payment_provider='mercadopago' LIMIT 1",[subscriptionId]);
    if (!subscription?.external_subscription_id) return Response.json({error:"La suscripción todavía no tiene identificador de Mercado Pago"},{status:409});
    const resource = await getDirectoryMercadoPagoPreapproval(subscription.external_subscription_id);
    await db.query("UPDATE tags_subscriptions SET provider_status=?,provider_init_point=COALESCE(?,provider_init_point),provider_next_payment_at=?,provider_last_synced_at=NOW(),provider_payload=?,auto_renew=?,updated_at=NOW() WHERE id=?",[resource.status || null,resource.init_point || null,resource.next_payment_date ? new Date(resource.next_payment_date) : null,JSON.stringify(resource),["authorized","pending"].includes(resource.status) ? 1 : 0,subscriptionId]);
    return Response.json({ok:true,status:resource.status});
  } catch(error) {
    console.error("DIRECTORY AUTOMATIC SUBSCRIPTION ACTION ERROR",error);
    return Response.json({error:error.message || "No se pudo sincronizar con Mercado Pago"},{status:error.status || 500});
  }
}

