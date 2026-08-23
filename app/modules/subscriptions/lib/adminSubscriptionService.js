import { db } from "@/app/lib/tags-db";
import { versionExistingPlan } from "./planVersionService";
import { activateSubscription } from "./subscriptionActivationService";
import { activateDirectoryWebForBusiness } from "@/app/modules/directory/lib/activateDirectoryWebForBusiness";
import { activateClientReviewsForBusiness } from "@/app/modules/client-reviews/lib/activateClientReviewsForBusiness";
import { sendMagicLink } from "@/app/lib/mailgun";
import { getChannelContextFromHost } from "@/app/lib/channelContext";
import crypto from "crypto";
import { directoryCalendarAmount } from "@/app/modules/directory/lib/directoryCalendarPricing";
import { notifySubscriptionCreated } from "./subscriptionNotifications";

const parseJson = value => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
};

function normalizeAdminExpiration(value) {
  if (!value) return null;
  const date = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw Object.assign(new Error("La fecha de vencimiento no es válida"), { status: 400 });
  }
  const parsed = new Date(`${date}T23:59:59`);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error("La fecha de vencimiento no es válida"), { status: 400 });
  }
  return `${date} 23:59:59`;
}

async function resolveSelection(input, actorId) {
  const businessId = Number(input.businessId || 0);
  const planId = Number(input.planId || 0);
  const selection = String(input.priceSelection || "");
  if (!businessId || !planId || !selection) {
    throw Object.assign(new Error("Cliente, plan y modalidad son obligatorios"), { status: 400 });
  }
  const { versionId } = await versionExistingPlan(planId, actorId);
  if (selection.startsWith("version:")) {
    const priceId = Number(selection.split(":")[1] || 0);
    const [[price]] = await db.query("SELECT * FROM tags_plan_version_prices WHERE id=? AND plan_version_id=? AND is_active=1 LIMIT 1", [priceId, versionId]);
    if (!price) throw Object.assign(new Error("El precio seleccionado ya no está disponible"), { status: 409 });
    return { versionId, price, priceCode: price.price_code };
  }
  const calendarMatch = selection.match(/^directory-calendar:(\d+):(\d+):(\d+)$/);
  if (calendarMatch) {
    const directoryPriceId = Number(calendarMatch[1]);
    const startMonth = Math.min(12, Math.max(1, Number(calendarMatch[2])));
    const durationMonths = Math.min(11, Math.max(1, Number(calendarMatch[3])));
    if (directoryPriceId === 0) {
      const [calendarRows] = await db.query("SELECT * FROM tags_plan_version_prices WHERE plan_version_id=? AND billing_mode='manual' AND calendar_month IS NOT NULL AND is_active=1 ORDER BY calendar_month", [versionId]);
      const byMonth = new Map(calendarRows.map(row => [Number(row.calendar_month), row]));
      const months = [];
      for (let offset = 0; offset < durationMonths; offset += 1) months.push(((startMonth - 1 + offset) % 12) + 1);
      const selected = months.map(month => byMonth.get(month)).filter(Boolean);
      if (selected.length !== months.length) throw Object.assign(new Error("El período seleccionado contiene meses sin precio configurado"), { status: 409 });
      const amount = selected.reduce((total, row) => total + Number(row.amount || 0), 0);
      return { versionId, price: { ...selected[0], amount, duration_months: durationMonths, billing_mode: "manual", currency: selected[0].currency || "ARS", settings_json: JSON.stringify({ startMonth, calendarMonths: months }) }, priceCode: `calendar_version_${startMonth}_${durationMonths}` };
    }
    const [[row]] = await db.query(`SELECT dpp.*,ds.name site_name,(SELECT sl.site_id FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id WHERE l.business_id=? ORDER BY sl.id LIMIT 1) business_site_id FROM tags_directory_plan_prices dpp INNER JOIN tags_directory_sites ds ON ds.id=dpp.site_id WHERE dpp.id=? AND dpp.plan_id=? AND dpp.is_active=1 LIMIT 1`, [businessId, directoryPriceId, planId]);
    const effectiveSiteId = Number(input.siteId || row?.business_site_id || 0);
    if (!row || Number(row.site_id) !== effectiveSiteId) throw Object.assign(new Error("El precio no corresponde al Directorio del cliente"), { status: 409 });
    const calculated = directoryCalendarAmount(row, startMonth, durationMonths);
    if (calculated.hasMissingPrice || calculated.amount <= 0) throw Object.assign(new Error("El período seleccionado contiene meses sin precio configurado"), { status: 409 });
    const priceCode = `site_${row.site_id}_calendar_${startMonth}_${durationMonths}`;
    const baseCode = `site_${row.site_id}_manual_month_${String(startMonth).padStart(2, "0")}`;
    const [[price]] = await db.query("SELECT * FROM tags_plan_version_prices WHERE plan_version_id=? AND price_code=? LIMIT 1", [versionId, baseCode]);
    if (!price) throw Object.assign(new Error("No se pudo resolver el precio calendario del plan"), { status: 409 });
    return { versionId, price: { ...price, amount: calculated.amount, duration_months: durationMonths, billing_mode: "manual", currency: row.currency || "ARS", settings_json: JSON.stringify({ siteId: row.site_id, startMonth, calendarMonths: calculated.months }) }, priceCode };
  }
  const match = selection.match(/^directory:(\d+):([a-z0-9_]+)$/);
  if (!match) throw Object.assign(new Error("Modalidad inválida"), { status: 400 });
  const directoryPriceId = Number(match[1]);
  const field = match[2];
  const allowed = new Set([
    ...Array.from({ length: 12 }, (_, index) => `manual_month_${String(index + 1).padStart(2, "0")}`),
    "manual_pack_3", "manual_pack_6", "manual_pack_12", "mercadopago_monthly"
  ]);
  if (!allowed.has(field)) throw Object.assign(new Error("Modalidad inválida"), { status: 400 });
  if (directoryPriceId === 0) {
    const [[price]] = await db.query("SELECT * FROM tags_plan_version_prices WHERE plan_version_id=? AND price_code=? AND is_active=1 LIMIT 1", [versionId, field === "manual_pack_12" ? "manual_pack_12" : "mercadopago_monthly"]);
    if (!price) throw Object.assign(new Error("La modalidad seleccionada no tiene precio configurado"), { status: 409 });
    return { versionId, price, priceCode: price.price_code };
  }
  const [[row]] = await db.query(
    `SELECT dpp.*,ds.name site_name,(SELECT sl.site_id FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id WHERE l.business_id=? ORDER BY sl.id LIMIT 1) business_site_id FROM tags_directory_plan_prices dpp INNER JOIN tags_directory_sites ds ON ds.id=dpp.site_id WHERE dpp.id=? AND dpp.plan_id=? AND dpp.is_active=1 LIMIT 1`,
    [businessId, directoryPriceId, planId]
  );
  const requestedSiteId = Number(input.siteId || 0);
  const effectiveSiteId = requestedSiteId || Number(row?.business_site_id || 0);
  if (!row || !effectiveSiteId || Number(row.site_id) !== effectiveSiteId) {
    throw Object.assign(new Error("El precio no corresponde al Directorio del cliente"), { status: 409 });
  }
  const amount = Number(row[field] || 0);
  if (amount <= 0) throw Object.assign(new Error("La modalidad seleccionada no tiene precio configurado"), { status: 409 });
  const durationMonths = field === "manual_pack_3" ? 3 : field === "manual_pack_6" ? 6 : field === "manual_pack_12" ? 12 : 1;
  const billingMode = field === "mercadopago_monthly" ? "recurring" : "manual";
  const priceCode = `site_${row.site_id}_${field}`;
  const [[price]] = await db.query("SELECT * FROM tags_plan_version_prices WHERE plan_version_id=? AND price_code=? LIMIT 1", [versionId, priceCode]);
  if (!price) throw Object.assign(new Error("No se pudo resolver el precio del plan"), { status: 409 });
  return { versionId, price: { ...price, amount, duration_months: durationMonths, billing_mode: billingMode, currency: row.currency || "ARS" }, priceCode };
}

export async function createAdminSubscription(input, actorId = null) {
  const businessId = Number(input.businessId || 0);
  const planId = Number(input.planId || 0);
  const paymentState = input.paymentState === "paid" ? "paid" : "pending";
  const graceDays = Math.min(30, Math.max(0, Number(input.graceDays || 0)));
  const requestedExpiresAt = normalizeAdminExpiration(input.expiresAt);
  const resolved = await resolveSelection(input, actorId);
  if (input.customAmount !== undefined && input.customAmount !== null && input.customAmount !== "") {
    const customAmount = Number(input.customAmount);
    if (!Number.isFinite(customAmount) || customAmount <= 0) {
      throw Object.assign(new Error("El importe excepcional debe ser mayor a cero"), { status: 400 });
    }
    resolved.price = { ...resolved.price, amount: customAmount };
  }
  const conn = await db.getConnection();
  let subscriptionId;
  try {
    await conn.beginTransaction();
    const [[business]] = await conn.query("SELECT id,name,email FROM tags_businesses WHERE id=? LIMIT 1 FOR UPDATE", [businessId]);
    const [[plan]] = await conn.query("SELECT id,code,name,max_qr_codes FROM tags_plans WHERE id=? AND is_active=1 LIMIT 1", [planId]);
    if (!business || !plan) throw Object.assign(new Error("Cliente o plan inexistente"), { status: 404 });
    const [addons] = await conn.query("SELECT addon_code,quantity,entitlement_config_json FROM tags_plan_version_addons WHERE plan_version_id=? ORDER BY addon_code", [resolved.versionId]);
    const provider = resolved.price.billing_mode === "recurring" ? "mercadopago" : "manual";
    const [subscription] = await conn.query(
      `INSERT INTO tags_subscriptions (business_id,plan_id,status,payment_provider,amount,currency,started_at,expires_at,duration_months,source,next_billing_at,auto_renew,auto_disable_on_expire,grace_days,admin_override_until,created_at,updated_at) VALUES (?,?,'inactive',?,?,?,?,?,?,'manual',NULL,?,1,?,?,NOW(),NOW())`,
      [businessId, planId, provider, Number(resolved.price.amount), resolved.price.currency || "ARS", null, null, Number(resolved.price.duration_months || 1), provider === "mercadopago" ? 1 : 0, graceDays, requestedExpiresAt]
    );
    subscriptionId = Number(subscription.insertId);
    const snapshot = {
      schemaVersion: 1,
      plan: { id: planId, versionId: resolved.versionId, code: plan.code, name: plan.name, maxQrCodes: Number(plan.max_qr_codes || 0) },
      price: { id: Number(resolved.price.id), code: resolved.priceCode, billingMode: resolved.price.billing_mode, provider, durationMonths: Number(resolved.price.duration_months || 1), amount: Number(resolved.price.amount), currency: resolved.price.currency || "ARS", settings: parseJson(resolved.price.settings_json) },
      addons: addons.map(item => ({ code: item.addon_code, quantity: Number(item.quantity || 1), config: parseJson(item.entitlement_config_json) })),
      policy: { graceDays, requestedExpiresAt },
      createdBy: "admin"
    };
    await conn.query("INSERT INTO tags_subscription_terms (subscription_id,plan_version_id,offer_id,price_code,billing_mode,terms_snapshot_json) VALUES (?,?,NULL,?,?,?)", [subscriptionId, resolved.versionId, resolved.priceCode, resolved.price.billing_mode, JSON.stringify(snapshot)]);
    for (const addon of snapshot.addons) {
      const [businessAddon] = await conn.query(
        `INSERT INTO tags_business_addons (business_id,addon_code,quantity,status,started_at,expires_at,amount,currency,notes,created_at,updated_at) VALUES (?,?,?,'inactive',NULL,NULL,0,?,?,NOW(),NOW())`,
        [businessId, addon.code, addon.quantity, snapshot.price.currency, `Incluido en ${plan.name} · suscripción ${subscriptionId}`]
      );
      await conn.query(
        `INSERT INTO tags_subscription_addon_grants (subscription_id,business_id,business_addon_id,addon_code,quantity,status,entitlement_snapshot_json) VALUES (?,?,?,?,?,'pending',?)`,
        [subscriptionId, businessId, businessAddon.insertId, addon.code, addon.quantity, JSON.stringify(addon)]
      );
    }
    if (paymentState === "pending" && provider === "manual") {
      await conn.query(
        `INSERT INTO tags_subscription_payments (subscription_id,business_id,plan_id,amount,currency,provider,status,notes,created_at) VALUES (?,?,?,?,?,'manual','pending','Pendiente de imputación',NOW())`,
        [subscriptionId, businessId, planId, snapshot.price.amount, snapshot.price.currency]
      );
    }
    if (paymentState === "pending" && graceDays > 0) {
      if (requestedExpiresAt) {
        await conn.query("UPDATE tags_subscriptions SET status='trial',started_at=NOW(),expires_at=?,next_billing_at=? WHERE id=?", [requestedExpiresAt, requestedExpiresAt, subscriptionId]);
        await conn.query(`UPDATE tags_business_addons ba INNER JOIN tags_subscription_addon_grants g ON g.business_addon_id=ba.id SET ba.status='active',ba.started_at=NOW(),ba.expires_at=?,g.status='active',g.starts_at=NOW(),g.expires_at=?,ba.updated_at=NOW(),g.updated_at=NOW() WHERE g.subscription_id=?`, [requestedExpiresAt, requestedExpiresAt, subscriptionId]);
        await conn.query("UPDATE tags_businesses SET plan_id=?,subscription_status='trial',plan_started_at=NOW(),plan_expires_at=?,updated_at=NOW() WHERE id=?", [planId, requestedExpiresAt, businessId]);
      } else {
        await conn.query("UPDATE tags_subscriptions SET status='trial',started_at=NOW(),expires_at=DATE_ADD(NOW(),INTERVAL ? DAY),next_billing_at=DATE_ADD(NOW(),INTERVAL ? DAY) WHERE id=?", [graceDays, graceDays, subscriptionId]);
        await conn.query(`UPDATE tags_business_addons ba INNER JOIN tags_subscription_addon_grants g ON g.business_addon_id=ba.id SET ba.status='active',ba.started_at=NOW(),ba.expires_at=DATE_ADD(NOW(),INTERVAL ? DAY),g.status='active',g.starts_at=NOW(),g.expires_at=DATE_ADD(NOW(),INTERVAL ? DAY) WHERE g.subscription_id=?`, [graceDays, graceDays, subscriptionId]);
        await conn.query("UPDATE tags_businesses SET plan_id=?,subscription_status='trial',plan_started_at=NOW(),plan_expires_at=DATE_ADD(NOW(),INTERVAL ? DAY),updated_at=NOW() WHERE id=?", [planId, graceDays, businessId]);
      }
    }
    await conn.query(
      `INSERT INTO tags_subscription_audit_events (subscription_id,business_id,event_code,actor_type,actor_id,next_state_json,context_json) VALUES (?,?,'subscription.created','admin',?,?,?)`,
      [subscriptionId, businessId, actorId, JSON.stringify({ status: paymentState === "paid" ? "activating" : "pending_payment" }), JSON.stringify({ provider, priceCode: resolved.priceCode })]
    );
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
  if (paymentState === "paid") {
    await activateSubscription({ subscriptionId, provider: "manual", notes: "Pago imputado al crear la suscripción", actorType: "admin", actorId });
  }
  if (paymentState === "paid" || graceDays > 0) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [[context]] = await conn.query(`SELECT b.name,(SELECT sl.site_id FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id WHERE l.business_id=b.id ORDER BY sl.id LIMIT 1) site_id FROM tags_businesses b WHERE b.id=? LIMIT 1`, [businessId]);
      const [grants] = await conn.query("SELECT addon_code FROM tags_subscription_addon_grants WHERE subscription_id=?", [subscriptionId]);
      const codes = new Set(grants.map(item => item.addon_code));
      const origin = String(input.origin || "").replace(/\/+$/, "");
      const siteId = Number(input.siteId || context?.site_id || 0);
      if (codes.has("directory") && siteId) {
        await activateDirectoryWebForBusiness({ conn, businessId, siteId, origin });
      }
      if (codes.has("client_reviews")) {
        await activateClientReviewsForBusiness({ conn, businessId, title: `¿Cómo fue tu experiencia en ${context?.name || "nuestro negocio"}?`, slug: `${String(context?.name || `negocio-${businessId}`).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-opiniones`, baseUrl: origin, allowTrial: graceDays > 0 });
      }
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
  const [[recipient]] = await db.query("SELECT email FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
  if (recipient?.email && input.origin) {
    try {
      const token = crypto.randomUUID();
      await db.query("INSERT INTO tags_auth_tokens (email,token,expires_at) VALUES (?,?,DATE_ADD(NOW(),INTERVAL 15 MINUTE))", [recipient.email, token]);
      const origin = String(input.origin).replace(/\/+$/, "");
      const channel = await getChannelContextFromHost(new URL(origin).hostname);
      const brand = channel?.brandConfig || {};
      const suffix = String(channel?.code || "tags").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
      await sendMagicLink(recipient.email, `${origin}/api/auth/verify?token=${token}`, {
        name: brand.displayName || channel?.name || "Tags",
        logo: brand.logoUrl || brand.logo_url || "",
        color: brand.primaryColor || "#0fb957",
        from: brand.mailFrom || brand.mail_from || process.env[`MAILGUN_FROM_${suffix}`] || process.env.MAILGUN_FROM,
        mailgunDomain: brand.mailgunDomain || brand.mailgun_domain || process.env[`MAILGUN_DOMAIN_${suffix}`] || process.env.MAILGUN_DOMAIN
      });
    } catch (error) {
      console.error("SUBSCRIPTION ACCESS EMAIL ERROR", error);
    }
  }
  try {
    await notifySubscriptionCreated({ subscriptionId });
  } catch (error) {
    console.error("SUBSCRIPTION CREATED NOTIFICATION ERROR", error);
  }
  return { subscriptionId, paymentProvider: resolved.price.billing_mode === "recurring" ? "mercadopago" : "manual", requiresMercadoPago: resolved.price.billing_mode === "recurring" };
}
