import crypto from "crypto";
import webpush from "web-push";
import { db } from "@/app/lib/tags-db";

function configure() {
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    console.warn("WEB PUSH NOT CONFIGURED: faltan WEB_PUSH_VAPID_SUBJECT, NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY o WEB_PUSH_VAPID_PRIVATE_KEY");
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function normalizeIcon(value) {
  const icon = String(value || "").trim();
  if (!icon) return "";
  if (/^(https?:|data:|\/)/i.test(icon)) return icon;
  return `/${icon}`;
}

function resolveActionUrl(url, audience) {
  const value = String(url || "/dashboard");
  if (/^https?:\/\//i.test(value)) return value;
  if (audience !== "admin") return value;
  const platformOrigin = String(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL_PROD || "").replace(/\/+$/, "");
  return platformOrigin ? `${platformOrigin}${value.startsWith("/") ? value : `/${value}`}` : value;
}

async function resolvePushIcon(businessId, moduleCode, suppliedIcon) {
  if (suppliedIcon) return normalizeIcon(suppliedIcon);
  try {
    const [[business]] = await db.query("SELECT logo_url FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
    let moduleIcon = "";
    if (moduleCode === "guest_experience") {
      const [[guestApp]] = await db.query("SELECT slug,logo_url,settings_json FROM tags_guest_apps WHERE business_id=? ORDER BY status='published' DESC,id DESC LIMIT 1", [businessId]);
      const settings = parseJson(guestApp?.settings_json);
      moduleIcon = settings.pwaIcon192Url || settings.pwaIcon512Url || guestApp?.logo_url || "";
    }
    if (moduleIcon || business?.logo_url) return normalizeIcon(moduleIcon || business.logo_url);
    const [[site]] = await db.query(`SELECT ds.brand_config FROM tags_directory_listings dl
      INNER JOIN tags_directory_site_listings dsl ON dsl.listing_id=dl.id
      INNER JOIN tags_directory_sites ds ON ds.id=dsl.site_id AND ds.is_active=1
      WHERE dl.business_id=? ORDER BY dsl.publication_status='published' DESC,dsl.id LIMIT 1`, [businessId]);
    const brand = parseJson(site?.brand_config);
    return normalizeIcon(brand.logoUrl || brand.logo_url) || "/logo_tags_transparente.webp";
  } catch (error) {
    console.warn("PUSH ICON RESOLUTION ERROR", error?.message || error);
    return "/logo_tags_transparente.webp";
  }
}

export async function sendBusinessPush({ businessId, moduleCode, eventCode, entityType, entityId, title, body, url, icon = "", payload = {}, idempotencyKey, audience = "admin", recipientId = null }) {
  if (!configure()) return { ok: false, skipped: "vapid_not_configured" };
  try {
    const actionUrl = resolveActionUrl(url, audience);
    const [eventResult] = await db.query(`INSERT IGNORE INTO tags_notification_events
      (business_id,module_code,event_code,entity_type,entity_id,title,body,action_url,payload_json,idempotency_key)
      VALUES (?,?,?,?,?,?,?,?,?,?)`, [businessId, moduleCode, eventCode, entityType || null, entityId || null, title, body, actionUrl, JSON.stringify(payload), idempotencyKey]);
    let eventId = eventResult.insertId;
    if (!eventId) {
      const [[existing]] = await db.query("SELECT id FROM tags_notification_events WHERE idempotency_key=? LIMIT 1", [idempotencyKey]);
      eventId = existing?.id;
    }
    const resolvedIcon = await resolvePushIcon(businessId, moduleCode, icon);
    const recipientFilter = audience === "guest"
      ? " AND recipient_type='guest' AND recipient_id=?"
      : ` AND recipient_type<>'guest'
          AND (recipient_type<>'business_staff' OR EXISTS(
            SELECT 1 FROM tags_business_staff st
            INNER JOIN tags_business_staff_app_access aa
              ON aa.staff_id=st.id AND aa.business_id=st.business_id
            WHERE st.id=tags_push_subscriptions.recipient_id
              AND st.business_id=tags_push_subscriptions.business_id
              AND st.status='active' AND aa.status='active'
          ))`;
    const recipientParams = audience === "guest" ? [recipientId] : [];
    const [subscriptions] = await db.query(`SELECT * FROM tags_push_subscriptions WHERE business_id=? AND status='active'${recipientFilter}`, [businessId, ...recipientParams]);
    let sent = 0;
    for (const subscription of subscriptions) {
      const [delivery] = await db.query("INSERT IGNORE INTO tags_notification_deliveries (event_id,push_subscription_id) VALUES (?,?)", [eventId, subscription.id]);
      if (!delivery.affectedRows) continue;
      try {
        const result = await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_secret } }, JSON.stringify({ title, body, url: actionUrl, icon: resolvedIcon, badge: resolvedIcon, tag: `${moduleCode}:${entityType || "event"}:${entityId || crypto.randomUUID()}` }));
        await db.query("UPDATE tags_notification_deliveries SET status='sent',attempts=attempts+1,provider_status=?,sent_at=NOW() WHERE event_id=? AND push_subscription_id=?", [result.statusCode || 201, eventId, subscription.id]);
        await db.query("UPDATE tags_push_subscriptions SET last_success_at=NOW(),failure_count=0 WHERE id=?", [subscription.id]);
        sent++;
      } catch (error) {
        const statusCode = Number(error?.statusCode || 0) || null;
        await db.query("UPDATE tags_notification_deliveries SET status='failed',attempts=attempts+1,provider_status=?,last_error=?,failed_at=NOW() WHERE event_id=? AND push_subscription_id=?", [statusCode, String(error?.message || "Error Web Push").slice(0, 500), eventId, subscription.id]);
        await db.query("UPDATE tags_push_subscriptions SET status=IF(? IN (404,410),'expired',status),last_failure_at=NOW(),failure_count=failure_count+1 WHERE id=?", [statusCode, subscription.id]);
      }
    }
    return { ok: true, sent };
  } catch (error) {
    if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code)) return { ok: false, skipped: "migration_pending" };
    console.error("BUSINESS WEB PUSH ERROR", error);
    return { ok: false, error: error.message };
  }
}
