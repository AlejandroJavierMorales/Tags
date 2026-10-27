import { db } from "@/app/lib/tags-db";
import { reconcileMercadoPagoSubscription } from "@/app/modules/subscriptions/lib/subscriptionMercadoPagoReconciliation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const secret = String(process.env.SYSTEM_CRON_SECRET || "").trim();
  const received = String(req.headers.get("authorization") || req.headers.get("x-cron-secret") || "").replace(/^Bearer\s+/i, "").trim();
  if (!secret || received !== secret) return Response.json({error:"No autorizado"},{status:401});
  const [subscriptions] = await db.query(`SELECT s.id,s.external_subscription_id FROM tags_subscriptions s INNER JOIN tags_plans p ON p.id=s.plan_id WHERE s.payment_provider='mercadopago' AND s.external_subscription_id IS NOT NULL AND p.code IN ('directory_web','directory_web_plus') AND (s.provider_last_synced_at IS NULL OR s.provider_last_synced_at<DATE_SUB(NOW(),INTERVAL 6 HOUR)) ORDER BY COALESCE(s.provider_last_synced_at,'2000-01-01') LIMIT 50`);
  const results = [];
  for (const subscription of subscriptions) {
    try {
      const result = await reconcileMercadoPagoSubscription(subscription.id);
      results.push({...result,ok:true});
    } catch(error) {
      results.push({subscriptionId:subscription.id,ok:false,error:String(error.message || error).slice(0,300)});
    }
  }
  return Response.json({ok:true,processed:results.length,failed:results.filter(item=>!item.ok).length,results});
}
