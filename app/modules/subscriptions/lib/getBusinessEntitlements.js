import { db } from "@/app/lib/tags-db";
import { effectiveSubscriptionStatus, isEffectiveSubscriptionActive } from "./subscriptionState";

const parse = value => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
};

export async function getBusinessEntitlements(businessId, queryDb = db) {
  const [businessRows] = await queryDb.query(`
    SELECT b.id,b.plan_id,b.subscription_status,b.plan_started_at,b.plan_expires_at,
           p.code plan_code,p.name plan_name,p.max_qr_codes,p.dashboard_enabled,
           p.reports_enabled,p.reports_email_enabled,p.reports_whatsapp_enabled,
           p.analytics_enabled,p.analytics_plus_enabled,p.allow_pause_qr,
           p.allow_edit_qr,p.priority_support
      FROM tags_businesses b
      LEFT JOIN tags_plans p ON p.id=b.plan_id
     WHERE b.id=? LIMIT 1
  `, [businessId]);
  const business = businessRows[0];
  if (!business) return null;

  const [subscriptionRows] = await queryDb.query(`
    SELECT s.*,p.code plan_code,p.name plan_name,p.max_qr_codes,p.dashboard_enabled,
           p.reports_enabled,p.reports_email_enabled,p.reports_whatsapp_enabled,
           p.analytics_enabled,p.analytics_plus_enabled,p.allow_pause_qr,
           p.allow_edit_qr,p.priority_support
      FROM tags_subscriptions s
      INNER JOIN tags_plans p ON p.id=s.plan_id
     WHERE s.business_id=? AND s.status IN ('active','trial','past_due')
     ORDER BY (s.status='active') DESC,s.id DESC LIMIT 1
  `, [businessId]);
  const subscription = subscriptionRows[0] || null;
  const [addonRows] = await queryDb.query(`
    SELECT addon_code,SUM(quantity) quantity,MAX(expires_at) expires_at
      FROM tags_business_addons
     WHERE business_id=? AND status='active' AND (expires_at IS NULL OR expires_at>=NOW())
     GROUP BY addon_code
  `, [businessId]);

  let terms = null;
  if (subscription) {
    try {
      const [termRows] = await queryDb.query("SELECT * FROM tags_subscription_terms WHERE subscription_id=? LIMIT 1", [subscription.id]);
      if (termRows[0]) terms = { ...termRows[0], snapshot: parse(termRows[0].terms_snapshot_json) };
    } catch (error) {
      if (error?.code !== "ER_NO_SUCH_TABLE") throw error;
    }
  }

  const source = subscription || business;
  const addons = Object.fromEntries(addonRows.map(item => [item.addon_code, {
    enabled: true,
    quantity: Number(item.quantity || 0),
    expiresAt: item.expires_at || null
  }]));
  return {
    businessId: Number(business.id),
    subscription: subscription ? {
      id: Number(subscription.id),
      status: effectiveSubscriptionStatus(subscription),
      active: isEffectiveSubscriptionActive(subscription),
      startedAt: subscription.started_at,
      expiresAt: subscription.expires_at,
      paymentProvider: subscription.payment_provider,
      autoRenew: Boolean(Number(subscription.auto_renew || 0))
    } : null,
    plan: source?.plan_id ? {
      id: Number(source.plan_id),
      code: source.plan_code,
      name: source.plan_name,
      maxQrCodes: Number(source.max_qr_codes || 0),
      dashboardEnabled: Boolean(Number(source.dashboard_enabled || 0)),
      reportsEnabled: Boolean(Number(source.reports_enabled || 0)),
      reportsEmailEnabled: Boolean(Number(source.reports_email_enabled || 0)),
      reportsWhatsappEnabled: Boolean(Number(source.reports_whatsapp_enabled || 0)),
      analyticsEnabled: Boolean(Number(source.analytics_enabled || 0)),
      analyticsPlusEnabled: Boolean(Number(source.analytics_plus_enabled || 0)),
      allowPauseQr: Boolean(Number(source.allow_pause_qr || 0)),
      allowEditQr: Boolean(Number(source.allow_edit_qr || 0)),
      prioritySupport: Boolean(Number(source.priority_support || 0))
    } : null,
    addons,
    terms
  };
}

