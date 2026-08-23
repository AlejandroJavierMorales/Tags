import { db } from "@/app/lib/tags-db";

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
    `SELECT s.status subscription_status,g.status grant_status,g.expires_at
     FROM tags_subscription_addon_grants g
     INNER JOIN tags_subscriptions s ON s.id=g.subscription_id
     WHERE g.business_id=? AND g.addon_code=?
     ORDER BY s.id DESC,g.id DESC LIMIT 1`,
    [Number(businessId), String(addonCode)]
  );
  if (subscriptionGrant) {
    const allowed = ["active", "trial"].includes(subscriptionGrant.subscription_status)
      && subscriptionGrant.grant_status === "active"
      && (!subscriptionGrant.expires_at || new Date(subscriptionGrant.expires_at) >= new Date());
    return { allowed, managed: true, status: allowed ? "active" : "paused" };
  }
  const [[business]] = await db.query("SELECT subscription_status FROM tags_businesses WHERE id=? LIMIT 1", [Number(businessId)]);
  if (["inactive", "paused", "cancelled", "past_due", "expired"].includes(String(business?.subscription_status || "").toLowerCase())) {
    return { allowed: false, managed: true, status: "paused" };
  }
  const [rows] = await db.query(
    `SELECT status,expires_at
     FROM tags_business_addons
     WHERE business_id=? AND addon_code=?
     ORDER BY (status='active') DESC,id DESC`,
    [Number(businessId), String(addonCode)]
  );
  if (!rows.length) return { allowed: true, managed: false };
  const active = rows.some(row => row.status === "active" && (!row.expires_at || new Date(row.expires_at) >= new Date()));
  return { allowed: active, managed: true, status: active ? "active" : "paused" };
}

export async function getPagePublicEntitlement(slug) {
  const [[page]] = await db.query("SELECT p.business_id,p.page_type,b.name business_name FROM tags_qr_pages p INNER JOIN tags_businesses b ON b.id=p.business_id WHERE p.slug=? LIMIT 1", [String(slug || "")]);
  if (!page) return { allowed: true, managed: false };
  const addonCode = addonForPageType(page.page_type);
  return { ...(await getPublicEntitlement(page.business_id, addonCode)), businessId: page.business_id, businessName: page.business_name, addonCode };
}
