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
  if (!["admin", "platform_admin"].includes(audience)) return value;
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

export async function sendPushTest(endpointHash) {
  if (!configure()) return { ok: false, error: "Faltan las claves Web Push" };
  const [[subscription]] = await db.query("SELECT * FROM tags_push_subscriptions WHERE endpoint_hash=? AND status='active' LIMIT 1", [endpointHash]);
  if (!subscription) return { ok: false, error: "Este dispositivo no está registrado" };
  try {
    const result = await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_secret } }, JSON.stringify({ title: "Notificaciones funcionando", body: "Este dispositivo ya puede recibir avisos de la plataforma.", url: "/dashboard", icon: "/logo_tags_transparente.webp", badge: "/logo_tags_transparente.webp", tag: `tags-push-test-${Date.now()}` }));
    await db.query("UPDATE tags_push_subscriptions SET last_success_at=NOW(),last_failure_at=NULL,failure_count=0 WHERE id=?", [subscription.id]);
    return { ok: true, statusCode: result.statusCode || 201 };
  } catch (error) {
    const statusCode = Number(error?.statusCode || 0) || null;
    await db.query("UPDATE tags_push_subscriptions SET status=IF(? IN (404,410),'expired',status),last_failure_at=NOW(),failure_count=failure_count+1 WHERE id=?", [statusCode, subscription.id]);
    return { ok: false, error: String(error?.message || "No se pudo enviar la prueba"), statusCode };
  }
}

export async function sendBusinessPush({ businessId, moduleCode, eventCode, entityType, entityId, title, body, url, icon = "", payload = {}, idempotencyKey, audience = "admin", recipientId = null, includePlatformAdmins = false }) {
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
    const businessAdminFilter = `business_id=? AND recipient_type<>'guest' AND recipient_type<>'platform_admin'
          AND (recipient_type<>'business_staff' OR EXISTS(
            SELECT 1 FROM tags_business_staff st
            INNER JOIN tags_business_staff_app_access aa
              ON aa.staff_id=st.id AND aa.business_id=st.business_id
            WHERE st.id=tags_push_subscriptions.recipient_id
              AND st.business_id=tags_push_subscriptions.business_id
              AND st.status='active' AND aa.status='active' AND aa.app_code=?
          ))`;
    const includePlatformRecipients = includePlatformAdmins || (moduleCode === "guest_experience" && audience === "admin");
    const recipientFilter = audience === "platform_admin"
      ? "recipient_type='platform_admin'"
      : audience === "guest"
        ? "business_id=? AND recipient_type='guest' AND recipient_id=?"
        : includePlatformRecipients ? `(recipient_type='platform_admin' OR (${businessAdminFilter}))` : businessAdminFilter;
    const recipientParams = audience === "platform_admin"
      ? []
      : audience === "guest"
        ? [businessId, recipientId]
        : [businessId, moduleCode];
    const [subscriptions] = await db.query(`SELECT * FROM tags_push_subscriptions WHERE ${recipientFilter} AND status='active'`, recipientParams);
    if (!subscriptions.length) console.warn("BUSINESS WEB PUSH WITHOUT RECIPIENTS", { businessId, moduleCode, eventCode, audience, includePlatformAdmins: includePlatformRecipients });
    let sent = 0;
    for (const subscription of subscriptions) {
      const [delivery] = await db.query("INSERT IGNORE INTO tags_notification_deliveries (event_id,push_subscription_id) VALUES (?,?)", [eventId, subscription.id]);
      if (!delivery.affectedRows) {
        const [[existingDelivery]] = await db.query("SELECT status FROM tags_notification_deliveries WHERE event_id=? AND push_subscription_id=? LIMIT 1", [eventId, subscription.id]);
        if (existingDelivery?.status === "sent") continue;
        await db.query("UPDATE tags_notification_deliveries SET status='pending',last_error=NULL,updated_at=NOW() WHERE event_id=? AND push_subscription_id=?", [eventId, subscription.id]);
      }
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
