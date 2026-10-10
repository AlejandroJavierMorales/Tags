import { activateDirectoryWebForBusiness } from "./activateDirectoryWebForBusiness";
import { activateClientReviewsForBusiness } from "@/app/modules/client-reviews/lib/activateClientReviewsForBusiness";
import { getSubscriptionFoundationStatus } from "@/app/modules/subscriptions/lib/subscriptionSchema";

const ELIGIBLE_STATUSES = new Set(["active", "trial"]);

function reviewSlug(name, businessId) {
  return `${String(name || `negocio-${businessId}`)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-opiniones`;
}

async function resolveDirectoryPlan(conn, businessId) {
  const [[subscription]] = await conn.query(
    `SELECT s.id subscription_id,s.status,s.started_at,s.expires_at,s.amount,s.currency,
            p.id plan_id,p.code plan_code,p.name plan_name,b.name business_name
       FROM tags_subscriptions s
       INNER JOIN tags_plans p ON p.id=s.plan_id
       INNER JOIN tags_businesses b ON b.id=s.business_id
      WHERE s.business_id=?
        AND p.code IN ('directory_web','directory_web_plus')
      ORDER BY s.id DESC
      LIMIT 1 FOR UPDATE`,
    [businessId]
  );
  if (subscription) {
    if (!ELIGIBLE_STATUSES.has(String(subscription.status || ""))) return null;
    if (subscription.expires_at && new Date(subscription.expires_at).getTime() < Date.now()) return null;
    return subscription;
  }

  const [[legacy]] = await conn.query(
    `SELECT NULL subscription_id,b.subscription_status status,b.plan_started_at started_at,
            b.plan_expires_at expires_at,p.price amount,p.currency,
            p.id plan_id,p.code plan_code,p.name plan_name,b.name business_name
       FROM tags_businesses b
       INNER JOIN tags_plans p ON p.id=b.plan_id
      WHERE b.id=? AND p.code IN ('directory_web','directory_web_plus')
      LIMIT 1 FOR UPDATE`,
    [businessId]
  );
  if (!legacy || !ELIGIBLE_STATUSES.has(String(legacy.status || ""))) return null;
  if (legacy.expires_at && new Date(legacy.expires_at).getTime() < Date.now()) return null;
  return legacy;
}

async function ensureBusinessAddon(conn, plan, addonCode) {
  const businessId = Number(plan.businessId);
  const [[existing]] = await conn.query(
    "SELECT id FROM tags_business_addons WHERE business_id=? AND addon_code=? ORDER BY id DESC LIMIT 1 FOR UPDATE",
    [businessId, addonCode]
  );
  const amount = addonCode === "directory" ? Number(plan.amount || 0) : 0;
  let businessAddonId = Number(existing?.id || 0);
  if (businessAddonId) {
    await conn.query(
      `UPDATE tags_business_addons
          SET quantity=1,status='active',started_at=COALESCE(started_at,?,NOW()),expires_at=?,
              amount=?,currency=?,notes=?,updated_at=NOW()
        WHERE id=?`,
      [plan.started_at || null, plan.expires_at || null, amount, plan.currency || "ARS", `Incluido en ${plan.plan_name}`, businessAddonId]
    );
  } else {
    const [result] = await conn.query(
      `INSERT INTO tags_business_addons
        (business_id,addon_code,quantity,status,started_at,expires_at,amount,currency,notes,created_at,updated_at)
       VALUES (?,?,1,'active',COALESCE(?,NOW()),?,?,?,?,NOW(),NOW())`,
      [businessId, addonCode, plan.started_at || null, plan.expires_at || null, amount, plan.currency || "ARS", `Incluido en ${plan.plan_name}`]
    );
    businessAddonId = Number(result.insertId);
  }
  await conn.query(
    "UPDATE tags_business_addons SET status='inactive',updated_at=NOW() WHERE business_id=? AND addon_code=? AND id<>? AND status='active'",
    [businessId, addonCode, businessAddonId]
  );
  return businessAddonId;
}

export async function reconcileDirectoryPlanForBusiness({ conn, businessId, siteId, origin }) {
  const plan = await resolveDirectoryPlan(conn, Number(businessId));
  if (!plan) return { reconciled: false, reason: "no_active_directory_plan" };
  plan.businessId = Number(businessId);

  const addonCodes = plan.plan_code === "directory_web_plus"
    ? ["directory", "client_reviews"]
    : ["directory"];
  const addonIds = new Map();
  for (const addonCode of addonCodes) {
    addonIds.set(addonCode, await ensureBusinessAddon(conn, plan, addonCode));
  }

  if (plan.subscription_id) {
    const foundation = await getSubscriptionFoundationStatus(conn);
    if (foundation.ready) {
      for (const addonCode of addonCodes) {
        await conn.query(
          `INSERT INTO tags_subscription_addon_grants
            (subscription_id,business_id,business_addon_id,addon_code,quantity,status,starts_at,expires_at,entitlement_snapshot_json)
           VALUES (?,?,?,?,1,'active',COALESCE(?,NOW()),?,?)
           ON DUPLICATE KEY UPDATE business_addon_id=VALUES(business_addon_id),quantity=1,status='active',
             starts_at=COALESCE(starts_at,VALUES(starts_at)),expires_at=VALUES(expires_at),
             entitlement_snapshot_json=VALUES(entitlement_snapshot_json),updated_at=NOW()`,
          [plan.subscription_id, businessId, addonIds.get(addonCode), addonCode, plan.started_at || null, plan.expires_at || null, JSON.stringify({ reconciled: true, planCode: plan.plan_code })]
        );
      }
    }
  }

  await activateDirectoryWebForBusiness({ conn, businessId, siteId, origin });
  if (addonCodes.includes("client_reviews")) {
    await activateClientReviewsForBusiness({
      conn,
      businessId,
      title: `¿Cómo fue tu experiencia en ${plan.business_name || "nuestro negocio"}?`,
      slug: reviewSlug(plan.business_name, businessId),
      baseUrl: origin,
      allowTrial: true
    });
  }
  return { reconciled: true, planCode: plan.plan_code, addonCodes };
}
