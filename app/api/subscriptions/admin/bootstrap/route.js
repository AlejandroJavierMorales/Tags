export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireSubscriptionAdmin, subscriptionAdminError } from "@/app/modules/subscriptions/lib/requireSubscriptionAdmin";
import { getSubscriptionFoundationStatus } from "@/app/modules/subscriptions/lib/subscriptionSchema";

const EFFECTIVE_STATUS = `CASE
  WHEN s.status='cancelled' THEN 'cancelled'
  WHEN s.status='inactive' THEN 'paused'
  WHEN s.status='past_due' THEN 'past_due'
  WHEN s.expires_at IS NOT NULL AND s.expires_at<NOW() THEN 'expired'
  WHEN s.status='trial' THEN 'trial'
  ELSE s.status END`;

export async function GET() {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  try {
    const foundation = await getSubscriptionFoundationStatus();
    const currentFilter = `s.id=(SELECT MAX(s2.id) FROM tags_subscriptions s2 WHERE s2.business_id=s.business_id)`;
    const [[summaryRows], [subscriptions], [payments], [plans], [addons], [businesses]] = await Promise.all([
      db.query(`SELECT COUNT(*) total,SUM((${EFFECTIVE_STATUS})='active') active,SUM((${EFFECTIVE_STATUS})='trial') trial,SUM((${EFFECTIVE_STATUS})='past_due') past_due,SUM((${EFFECTIVE_STATUS})='expired') expired,SUM((${EFFECTIVE_STATUS})='paused') paused,SUM((${EFFECTIVE_STATUS})='cancelled') cancelled,SUM(s.payment_provider='mercadopago') automatic FROM tags_subscriptions s WHERE ${currentFilter}`),
      db.query(`SELECT s.id,s.business_id,s.plan_id,s.status,${EFFECTIVE_STATUS} effective_status,IF(${currentFilter},1,0) is_current,s.payment_provider,s.duration_months,s.amount,s.currency,s.started_at,s.expires_at,s.auto_renew,s.external_subscription_id,b.name business_name,b.email business_email,p.code plan_code,p.name plan_name,p.is_free FROM tags_subscriptions s INNER JOIN tags_businesses b ON b.id=s.business_id INNER JOIN tags_plans p ON p.id=s.plan_id ORDER BY s.id DESC LIMIT 250`),
      db.query(`SELECT pay.id,pay.subscription_id,pay.business_id,pay.plan_id,pay.amount,pay.currency,pay.provider,pay.status,pay.paid_at,pay.period_start,pay.period_end,pay.notes,pay.created_at,b.name business_name,p.name plan_name FROM tags_subscription_payments pay INNER JOIN tags_businesses b ON b.id=pay.business_id INNER JOIN tags_plans p ON p.id=pay.plan_id ORDER BY COALESCE(pay.paid_at,pay.created_at) DESC,pay.id DESC LIMIT 100`),
      db.query("SELECT id,code,name,description,price,currency,max_qr_codes,is_active,is_public,is_free,sort_order FROM tags_plans ORDER BY is_active DESC,sort_order,name"),
      db.query("SELECT id,code,name,description,default_quantity,addon_type,page_type,is_active FROM tags_addons WHERE is_active=1 ORDER BY name"),
      db.query(`SELECT b.id,b.name,b.display_name,b.email,b.phone,b.whatsapp,b.address,b.postal_code,b.description,b.logo_url,b.website_url,b.instagram_url,b.facebook_url,b.latitude,b.longitude,(SELECT sl.site_id FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id WHERE l.business_id=b.id ORDER BY sl.id LIMIT 1) directory_site_id FROM tags_businesses b ORDER BY b.name,b.email`),
    ]);
    let directoryPrices = [];
    try {
      [directoryPrices] = await db.query(`SELECT dpp.*,p.name plan_name,p.code plan_code,ds.name site_name FROM tags_directory_plan_prices dpp INNER JOIN tags_plans p ON p.id=dpp.plan_id INNER JOIN tags_directory_sites ds ON ds.id=dpp.site_id WHERE dpp.is_active=1 AND p.is_active=1 AND ds.is_active=1 ORDER BY ds.name,p.name`);
    } catch (error) {
      if (!(["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code))) throw error;
      console.error("SUBSCRIPTION CENTER DIRECTORY PRICES UNAVAILABLE", { code: error.code, message: error.message });
    }
    let offers = [];
    let versionedPlans = [];
    let offerPrices = [];
    let auditEvents = [];
    let planAddons = [];
    let planPrices = [];
    const [directorySites] = await db.query("SELECT id,name,code,primary_host FROM tags_directory_sites WHERE is_active=1 ORDER BY name");
    if (foundation.ready) {
      [offers] = await db.query(`SELECT o.*,b.name business_name,p.name plan_name FROM tags_subscription_offers o LEFT JOIN tags_businesses b ON b.id=o.business_id INNER JOIN tags_plans p ON p.id=o.plan_id ORDER BY o.created_at DESC LIMIT 50`);
      [versionedPlans] = await db.query(`SELECT p.id,p.code,p.name,p.description,p.currency,p.max_qr_codes,p.is_active,p.is_free,COALESCE(pr.visibility,IF(p.is_public=1,'public','private')) visibility,pr.owner_business_id,pr.current_version_id,b.name owner_business_name,v.version_number,v.status version_status,(pr.plan_id IS NOT NULL) is_versioned,(SELECT COUNT(*) FROM tags_plan_version_addons va WHERE va.plan_version_id=pr.current_version_id) addon_count,(SELECT COUNT(*) FROM tags_plan_version_prices vp WHERE vp.plan_version_id=pr.current_version_id AND vp.is_active=1) price_count FROM tags_plans p LEFT JOIN tags_plan_profiles pr ON pr.plan_id=p.id LEFT JOIN tags_businesses b ON b.id=pr.owner_business_id LEFT JOIN tags_plan_versions v ON v.id=pr.current_version_id ORDER BY p.is_active DESC,p.name`);
      [offerPrices] = await db.query(`SELECT vp.id,vp.plan_version_id,v.plan_id,p.name plan_base_name,pr.visibility,pr.owner_business_id,vp.price_code,vp.billing_mode,vp.provider,vp.duration_months,vp.calendar_month,vp.amount,vp.currency,CAST(JSON_UNQUOTE(JSON_EXTRACT(vp.settings_json,'$.siteId')) AS UNSIGNED) site_id,JSON_UNQUOTE(JSON_EXTRACT(vp.settings_json,'$.siteName')) site_name FROM tags_plan_version_prices vp INNER JOIN tags_plan_versions v ON v.id=vp.plan_version_id AND v.status='active' INNER JOIN tags_plans p ON p.id=v.plan_id AND p.is_active=1 INNER JOIN tags_plan_profiles pr ON pr.plan_id=p.id WHERE vp.is_active=1 ORDER BY p.name,vp.billing_mode,vp.duration_months,vp.calendar_month`);
      offerPrices = offerPrices.map(item => ({
        ...item,
        plan_name: `${item.plan_base_name || ""}${item.site_name ? ` · ${item.site_name}` : ""}${item.calendar_month == null ? "" : ` · mes ${item.calendar_month}`}`
      }));
      [auditEvents] = await db.query(`SELECT e.id,e.subscription_id,e.business_id,e.event_code,e.actor_type,e.actor_id,e.previous_state_json,e.next_state_json,e.context_json,e.created_at,b.name business_name,b.email business_email,p.name plan_name FROM tags_subscription_audit_events e LEFT JOIN tags_businesses b ON b.id=e.business_id LEFT JOIN tags_subscriptions s ON s.id=e.subscription_id LEFT JOIN tags_plans p ON p.id=s.plan_id ORDER BY e.created_at DESC,e.id DESC LIMIT 500`);
      [planAddons] = await db.query("SELECT pr.plan_id,a.plan_version_id,a.addon_code,a.quantity,a.entitlement_config_json FROM tags_plan_profiles pr INNER JOIN tags_plan_version_addons a ON a.plan_version_id=pr.current_version_id ORDER BY pr.plan_id,a.addon_code");
      [planPrices] = await db.query("SELECT pr.plan_id,p.* FROM tags_plan_profiles pr INNER JOIN tags_plan_version_prices p ON p.plan_version_id=pr.current_version_id WHERE p.is_active=1 ORDER BY pr.plan_id,p.duration_months,p.calendar_month,p.id");
    }
    return Response.json({ ok: true, foundation, summary: summaryRows[0] || {}, subscriptions, payments, plans, addons, businesses, directorySites, directoryPrices, offers, versionedPlans, offerPrices, auditEvents, planAddons, planPrices });
  } catch (error) {
    console.error("SUBSCRIPTION CENTER BOOTSTRAP ERROR", error);
    return Response.json({ ok: false, error: "No se pudo cargar el Centro de Suscripciones", detail: error?.message || error?.code || "Error interno" }, { status: 500 });
  }
}
