import { db } from "@/app/lib/tags-db";
import { isEffectiveSubscriptionActive } from "./subscriptionState";

const PAGE_ADDONS = {
  directory: "directory",
  store: "store",
  resto: "resto",
  turnos: "turnos",
  client_reviews: "client_reviews",
  guest_experience: "guest_experience",
  tags_id: "tagsid",
  qr_page: "qr_page"
};

export function addonForPageType(pageType) {
  return PAGE_ADDONS[String(pageType || "").toLowerCase()] || null;
}

export async function getPublicEntitlement(businessId, addonCode) {
  if (!businessId || !addonCode) return { allowed: true, managed: false };
  const [[subscriptionGrant]] = await db.query(
    `SELECT s.status,s.expires_at,s.grace_days,s.auto_disable_on_expire,s.admin_override_until,
            g.status grant_status
     FROM tags_subscription_addon_grants g
     INNER JOIN tags_subscriptions s ON s.id=g.subscription_id
     WHERE g.business_id=? AND g.addon_code=?
     ORDER BY s.id DESC,g.id DESC LIMIT 1`,
    [Number(businessId), String(addonCode)]
  );
  if (subscriptionGrant) {
    const allowed = isEffectiveSubscriptionActive(subscriptionGrant)
      && subscriptionGrant.grant_status === "active";
    return { allowed, managed: true, status: allowed ? "active" : "paused" };
  }
  const [[currentSubscription]] = await db.query(
    `SELECT status,expires_at,grace_days,auto_disable_on_expire,admin_override_until
       FROM tags_subscriptions WHERE business_id=? ORDER BY id DESC LIMIT 1`,
    [Number(businessId)]
  );
  if (currentSubscription && !isEffectiveSubscriptionActive(currentSubscription)) {
    return { allowed: false, managed: true, status: "paused" };
  }
  const [[business]] = await db.query("SELECT subscription_status FROM tags_businesses WHERE id=? LIMIT 1", [Number(businessId)]);
  if (!currentSubscription && ["inactive", "paused", "cancelled", "past_due", "expired"].includes(String(business?.subscription_status || "").toLowerCase())) {
    return { allowed: false, managed: true, status: "paused" };
  }
  const [rows] = await db.query(
    `SELECT status,expires_at,grace_days,auto_disable_on_expire,admin_override_until
     FROM tags_business_addons
     WHERE business_id=? AND addon_code=?
     ORDER BY (status='active') DESC,id DESC`,
    [Number(businessId), String(addonCode)]
  );
  if (!rows.length) return { allowed: true, managed: false };
  const active = rows.some(row => isEffectiveSubscriptionActive(row));
  return { allowed: active, managed: true, status: active ? "active" : "paused" };
}

export async function getPagePublicEntitlement(slug) {
  const [[page]] = await db.query("SELECT p.business_id,p.page_type,b.name business_name FROM tags_qr_pages p INNER JOIN tags_businesses b ON b.id=p.business_id WHERE p.slug=? LIMIT 1", [String(slug || "")]);
  if (!page) return { allowed: true, managed: false };
  const addonCode = addonForPageType(page.page_type);
  return { ...(await getPublicEntitlement(page.business_id, addonCode)), businessId: page.business_id, businessName: page.business_name, addonCode };
}
