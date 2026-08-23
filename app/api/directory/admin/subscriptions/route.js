import { db } from "@/app/lib/tags-db";
import { requireDirectoryAdmin, directoryAdminError } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { activateDirectoryWebForBusiness } from "@/app/modules/directory/lib/activateDirectoryWebForBusiness";
import { sendMail } from "@/app/lib/sendMail";
import { directoryEmailBranding, directoryEmailContact, directoryEmailHeader } from "@/app/modules/directory/lib/directoryEmailBranding";
import { directoryMercadoPagoBaseUrl, ensureDirectoryMercadoPagoSubscription, updateDirectoryMercadoPagoPreapproval } from "@/app/modules/directory/lib/directoryMercadoPago";
import { activateClientReviewsForBusiness } from "@/app/modules/client-reviews/lib/activateClientReviewsForBusiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EFFECTIVE_STATUS = `CASE
  WHEN s.status='trial' THEN 'pending'
  WHEN s.status='cancelled' THEN 'cancelled'
  WHEN s.expires_at IS NOT NULL AND s.expires_at<NOW() THEN 'expired'
  WHEN s.status='inactive' THEN 'paused'
  WHEN s.status='past_due' THEN 'past_due'
  ELSE 'active' END`;

async function hasNoticeColumns(queryDb = db) {
  const [rows] = await queryDb.query(`
    SELECT COUNT(*) total
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE()
       AND TABLE_NAME='tags_subscriptions'
       AND COLUMN_NAME IN ('last_expiration_notice_at','last_expiration_notice_by')
  `);
  return Number(rows[0]?.total || 0) === 2;
}

export async function GET(req) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);

  const { searchParams } = new URL(req.url);
  const search = String(searchParams.get("search") || "").trim().slice(0, 120);
  const status = String(searchParams.get("status") || "all");
  const siteId = Number(searchParams.get("siteId") || 0);
  const planId = Number(searchParams.get("planId") || 0);
  const paymentProvider = String(searchParams.get("paymentProvider") || "all");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = 20;
  const trackingEnabled = await hasNoticeColumns();
  const noticeSelect = trackingEnabled
    ? "s.last_expiration_notice_at,s.last_expiration_notice_by,"
    : "NULL last_expiration_notice_at,NULL last_expiration_notice_by,";

  const conditions = ["p.code IN ('directory_web','directory_web_plus')"];
  const params = [];
  if (search) {
    conditions.push("(b.name LIKE ? OR b.display_name LIKE ? OR b.email LIKE ?)");
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (siteId) {
    conditions.push("EXISTS (SELECT 1 FROM tags_directory_listings fl INNER JOIN tags_directory_site_listings fsl ON fsl.listing_id=fl.id WHERE fl.business_id=s.business_id AND fsl.site_id=?)");
    params.push(siteId);
  }
  if (planId) { conditions.push("s.plan_id=?"); params.push(planId); }
  if (paymentProvider !== "all") { conditions.push("s.payment_provider=?"); params.push(paymentProvider); }
  if (status === "expiring") conditions.push("s.status='active' AND s.expires_at BETWEEN NOW() AND DATE_ADD(NOW(),INTERVAL 10 DAY)");
  else if (status !== "all" && status !== "free") { conditions.push(`${EFFECTIVE_STATUS}=?`); params.push(status); }
  const where = conditions.join(" AND ");

  const [countRows] = await db.query(`SELECT COUNT(DISTINCT s.id) total FROM tags_subscriptions s INNER JOIN (SELECT ss.business_id,MAX(ss.id) subscription_id FROM tags_subscriptions ss INNER JOIN tags_plans pp ON pp.id=ss.plan_id WHERE pp.code IN ('directory_web','directory_web_plus') GROUP BY ss.business_id) current_subscription ON current_subscription.subscription_id=s.id INNER JOIN tags_businesses b ON b.id=s.business_id INNER JOIN tags_plans p ON p.id=s.plan_id WHERE ${where}`, params);
  const [rows] = await db.query(`
    SELECT s.id subscription_id,s.business_id,s.plan_id,s.status raw_status,${EFFECTIVE_STATUS} effective_status,
           s.payment_provider,s.provider_status,s.external_subscription_id,s.amount,s.currency,s.started_at,s.expires_at,s.duration_months,s.auto_renew,
           ${noticeSelect}
           b.name business_name,b.email business_email,
           COALESCE(NULLIF(b.whatsapp,''),(SELECT NULLIF(lw.whatsapp,'') FROM tags_directory_listings lw WHERE lw.business_id=b.id LIMIT 1),NULLIF(b.phone,''),(SELECT lw.phone FROM tags_directory_listings lw WHERE lw.business_id=b.id LIMIT 1)) business_whatsapp,
           p.name plan_name,p.code plan_code,
           (SELECT GROUP_CONCAT(DISTINCT ss.id ORDER BY ss.name) FROM tags_directory_listings ll INNER JOIN tags_directory_site_listings sl ON sl.listing_id=ll.id INNER JOIN tags_directory_sites ss ON ss.id=sl.site_id WHERE ll.business_id=b.id) site_ids,
           (SELECT GROUP_CONCAT(DISTINCT ss.name ORDER BY ss.name SEPARATOR ' · ') FROM tags_directory_listings ll INNER JOIN tags_directory_site_listings sl ON sl.listing_id=ll.id INNER JOIN tags_directory_sites ss ON ss.id=sl.site_id WHERE ll.business_id=b.id) site_names,
           (SELECT ss.name FROM tags_directory_listings ll INNER JOIN tags_directory_site_listings sl ON sl.listing_id=ll.id INNER JOIN tags_directory_sites ss ON ss.id=sl.site_id WHERE ll.business_id=b.id ORDER BY ss.name LIMIT 1) primary_site_name
      FROM tags_subscriptions s
      INNER JOIN (SELECT ss.business_id,MAX(ss.id) subscription_id FROM tags_subscriptions ss INNER JOIN tags_plans pp ON pp.id=ss.plan_id WHERE pp.code IN ('directory_web','directory_web_plus') GROUP BY ss.business_id) current_subscription ON current_subscription.subscription_id=s.id
      INNER JOIN tags_businesses b ON b.id=s.business_id
      INNER JOIN tags_plans p ON p.id=s.plan_id
     WHERE ${where}
     ORDER BY COALESCE(s.expires_at,'9999-12-31') ASC,s.id DESC
     LIMIT ? OFFSET ?
  `, [...params, pageSize, (page - 1) * pageSize]);

  const [kpis] = await db.query(`
    SELECT COUNT(*) total,
           SUM(effective_status='active') active,
           SUM(effective_status='pending') pending,
           SUM(effective_status='paused') paused,
           SUM(effective_status='expired') expired,
           SUM(effective_status='cancelled') cancelled,
           SUM(effective_status='past_due') past_due,
           SUM(raw_status='active' AND expires_at BETWEEN NOW() AND DATE_ADD(NOW(),INTERVAL 10 DAY)) expiring
      FROM (
        SELECT s.status raw_status,s.expires_at,${EFFECTIVE_STATUS} effective_status
          FROM tags_subscriptions s
          INNER JOIN (SELECT ss.business_id,MAX(ss.id) subscription_id FROM tags_subscriptions ss INNER JOIN tags_plans pp ON pp.id=ss.plan_id WHERE pp.code IN ('directory_web','directory_web_plus') GROUP BY ss.business_id) current_subscription ON current_subscription.subscription_id=s.id
          INNER JOIN tags_plans p ON p.id=s.plan_id
         WHERE p.code IN ('directory_web','directory_web_plus')
      ) summary
  `);
  const [sites] = await db.query("SELECT id,name FROM tags_directory_sites WHERE is_active=1 ORDER BY name");
  const [plans] = await db.query("SELECT id,name,code,max_qr_codes FROM tags_plans WHERE code IN ('directory_web','directory_web_plus') AND is_active=1 ORDER BY sort_order,name");
  const [businesses] = await db.query(`
    SELECT b.id,b.name,b.email,l.id listing_id,l.qr_page_id,
           GROUP_CONCAT(DISTINCT sl.site_id) site_ids,
           MIN(sl.is_free) is_free,
           (SELECT s.id FROM tags_subscriptions s INNER JOIN tags_plans p ON p.id=s.plan_id WHERE s.business_id=b.id AND p.code IN ('directory_web','directory_web_plus') AND s.status IN ('active','trial','inactive','past_due') ORDER BY s.id DESC LIMIT 1) current_subscription_id,
           (SELECT p.name FROM tags_subscriptions s INNER JOIN tags_plans p ON p.id=s.plan_id WHERE s.business_id=b.id AND p.code IN ('directory_web','directory_web_plus') AND s.status IN ('active','trial','inactive','past_due') ORDER BY s.id DESC LIMIT 1) current_plan_name,
           (SELECT s.status FROM tags_subscriptions s INNER JOIN tags_plans p ON p.id=s.plan_id WHERE s.business_id=b.id AND p.code IN ('directory_web','directory_web_plus') AND s.status IN ('active','trial','inactive','past_due') ORDER BY s.id DESC LIMIT 1) current_subscription_status
      FROM tags_businesses b
      INNER JOIN tags_directory_listings l ON l.business_id=b.id
      INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
     GROUP BY b.id,b.name,b.email,l.id,l.qr_page_id
     ORDER BY b.name
  `);
  return Response.json({ ok: true, subscriptions: rows, kpis: kpis[0] || {}, sites, plans, businesses, page, pageSize, total: Number(countRows[0]?.total || 0), noticeTrackingEnabled: trackingEnabled, noticeDays: 10 });
}

function addMonths(value, months) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + Number(months || 1));
  return date;
}

async function configuredPrice(conn, { siteId, planId, durationMonths, provider }) {
  const [[row]] = await conn.query("SELECT * FROM tags_directory_plan_prices WHERE site_id=? AND plan_id=? AND is_active=1 LIMIT 1", [siteId, planId]);
  if (!row) return null;
  if (provider === "mercadopago") return Number(row.mercadopago_monthly || 0);
  if (Number(durationMonths) === 3) return Number(row.manual_pack_3 || 0);
  if (Number(durationMonths) === 6) return Number(row.manual_pack_6 || 0);
  if (Number(durationMonths) === 12) return Number(row.manual_pack_12 || 0);
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  return Number(row[`manual_month_${month}`] || 0);
}

export async function POST(req) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const body = await req.json().catch(() => null);
  const subscriptionId = Number(body?.subscriptionId || 0);
  const action = String(body?.action || "");
  if (action === "create") return createSubscription(req, body, access);
  if (!subscriptionId || !["pause", "reactivate", "cancel", "notice", "make_free", "edit"].includes(action)) return Response.json({ error: "Acción inválida" }, { status: 400 });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(`SELECT s.* FROM tags_subscriptions s INNER JOIN tags_plans p ON p.id=s.plan_id WHERE s.id=? AND p.code IN ('directory_web','directory_web_plus') LIMIT 1 FOR UPDATE`, [subscriptionId]);
    const subscription = rows[0];
    if (!subscription) { await conn.rollback(); return Response.json({ error: "Suscripción no encontrada" }, { status: 404 }); }

    if (action === "edit") {
      const planId = Number(body?.planId || subscription.plan_id);
      const amount = Number(body?.amount);
      const provider = ["manual", "transfer", "mercadopago"].includes(String(body?.provider)) ? String(body.provider) : subscription.payment_provider || "manual";
      const durationMonths = [1, 3, 6, 12].includes(Number(body?.durationMonths)) ? Number(body.durationMonths) : Number(subscription.duration_months || 1);
      const startedAt = body?.startedAt ? new Date(`${body.startedAt}T12:00:00`) : new Date(subscription.started_at || Date.now());
      const expiresAt = body?.expiresAt ? new Date(`${body.expiresAt}T23:59:59`) : (subscription.expires_at ? new Date(subscription.expires_at) : null);
      const [[plan]] = await conn.query("SELECT id FROM tags_plans WHERE id=? AND code IN ('directory_web','directory_web_plus') AND is_active=1 LIMIT 1", [planId]);
      if (!plan || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(startedAt.getTime()) || (expiresAt && Number.isNaN(expiresAt.getTime()))) {
        await conn.rollback();
        return Response.json({ error: "Plan, importe o fechas inválidas" }, { status: 400 });
      }
      if (provider === "mercadopago" && durationMonths !== 1) {
        await conn.rollback();
        return Response.json({ error: "Mercado Pago utiliza únicamente períodos mensuales" }, { status: 400 });
      }
      const changedToMercadoPago = provider === "mercadopago" && subscription.payment_provider !== "mercadopago";
      const changedFromMercadoPago = provider !== "mercadopago" && subscription.payment_provider === "mercadopago";
      if (changedFromMercadoPago && subscription.external_subscription_id) await updateDirectoryMercadoPagoPreapproval(subscription.external_subscription_id, "cancelled");
      const nextStatus = changedToMercadoPago ? "trial" : subscription.status;
      const nextExpiresAt = changedToMercadoPago ? new Date(Date.now() + 72 * 60 * 60 * 1000) : expiresAt;
      await conn.query(`UPDATE tags_subscriptions SET plan_id=?,amount=?,payment_provider=?,status=?,started_at=?,expires_at=?,duration_months=?,next_billing_at=?,auto_renew=?,external_subscription_id=?,provider_status=?,provider_init_point=?,provider_next_payment_at=?,provider_last_synced_at=?,provider_payload=?,updated_at=NOW() WHERE id=?`, [
        planId, amount, provider, nextStatus, startedAt, nextExpiresAt, durationMonths, nextExpiresAt,
        provider === "mercadopago" ? 1 : 0,
        changedFromMercadoPago ? null : subscription.external_subscription_id,
        changedFromMercadoPago ? null : subscription.provider_status,
        changedFromMercadoPago ? null : subscription.provider_init_point,
        changedFromMercadoPago ? null : subscription.provider_next_payment_at,
        changedFromMercadoPago ? null : subscription.provider_last_synced_at,
        changedFromMercadoPago ? null : subscription.provider_payload,
        subscriptionId
      ]);
      await conn.query("UPDATE tags_businesses SET plan_id=?,subscription_status=?,plan_started_at=?,plan_expires_at=?,updated_at=NOW() WHERE id=?", [planId, nextStatus, startedAt, nextExpiresAt, subscription.business_id]);
      await conn.query("UPDATE tags_business_addons SET amount=?,expires_at=?,updated_at=NOW() WHERE business_id=? AND addon_code='directory'", [amount, nextExpiresAt, subscription.business_id]);
      await conn.query("UPDATE tags_subscription_payments SET plan_id=?,amount=?,updated_at=NOW() WHERE subscription_id=? AND status='pending'", [planId, amount, subscriptionId]);
      if (provider !== "mercadopago") {
        const [[currentPayment]] = await conn.query("SELECT id FROM tags_subscription_payments WHERE subscription_id=? AND status='approved' ORDER BY COALESCE(period_end,paid_at,created_at) DESC,id DESC LIMIT 1", [subscriptionId]);
        if (currentPayment) await conn.query("UPDATE tags_subscription_payments SET plan_id=?,amount=?,updated_at=NOW() WHERE id=?", [planId, amount, currentPayment.id]);
      }
      await conn.commit();
      const mpSubscription = provider === "mercadopago" ? await ensureDirectoryMercadoPagoSubscription({ subscriptionId, baseUrl: directoryMercadoPagoBaseUrl(req) }) : null;
      return Response.json({ ok: true, checkoutUrl: mpSubscription?.init_point || null, status: nextStatus });
    }

    if (action === "notice") {
      if (await hasNoticeColumns(conn)) await conn.query("UPDATE tags_subscriptions SET last_expiration_notice_at=NOW(),last_expiration_notice_by=?,updated_at=NOW() WHERE id=?", [Number(access.session?.businessId || 0) || null, subscriptionId]);
      await conn.commit();
      return Response.json({ ok: true });
    }

    if (subscription.payment_provider === "mercadopago" && subscription.external_subscription_id && ["pause", "reactivate", "cancel", "make_free"].includes(action)) {
      const providerStatus = action === "reactivate" ? "authorized" : action === "pause" ? "paused" : "cancelled";
      await updateDirectoryMercadoPagoPreapproval(subscription.external_subscription_id, providerStatus);
    }

    if (action === "make_free") {
      await conn.query("UPDATE tags_subscriptions SET status='cancelled',cancelled_at=NOW(),updated_at=NOW() WHERE business_id=? AND plan_id IN (SELECT id FROM tags_plans WHERE code IN ('directory_web','directory_web_plus')) AND status<>'cancelled'", [subscription.business_id]);
      await conn.query("UPDATE tags_business_addons SET status='inactive',updated_at=NOW() WHERE business_id=? AND addon_code='directory'", [subscription.business_id]);
      await conn.query("UPDATE tags_directory_listings SET status='published',updated_at=NOW() WHERE business_id=?", [subscription.business_id]);
      await conn.query(`UPDATE tags_directory_site_listings sl INNER JOIN tags_directory_listings l ON l.id=sl.listing_id SET sl.is_free=1,sl.publication_status='published',sl.updated_at=NOW() WHERE l.business_id=?`, [subscription.business_id]);
      await conn.query("UPDATE tags_qr_pages SET status='draft',updated_at=NOW() WHERE business_id=? AND page_type='directory'", [subscription.business_id]);
      const [[basicPlan]] = await conn.query("SELECT id FROM tags_plans WHERE code='basic' AND is_free=1 LIMIT 1");
      if (basicPlan) await conn.query("UPDATE tags_businesses SET plan_id=?,subscription_status='active',plan_expires_at=NULL,updated_at=NOW() WHERE id=? AND plan_id=?", [basicPlan.id, subscription.business_id, subscription.plan_id]);
      await conn.commit();
      return Response.json({ ok: true, status: "free" });
    }

    const nextStatus = action === "pause" ? "inactive" : action === "cancel" ? "cancelled" : "active";
    const addonStatus = action === "pause" ? "inactive" : action === "cancel" ? "cancelled" : "active";
    const listingStatus = action === "pause" ? "suspended" : action === "cancel" ? "archived" : "published";
    const publicationStatus = action === "cancel" ? "archived" : action === "pause" ? "hidden" : "published";
    await conn.query("UPDATE tags_subscriptions SET status=?,cancelled_at=?,updated_at=NOW() WHERE id=?", [nextStatus, action === "cancel" ? new Date() : null, subscriptionId]);
    await conn.query("UPDATE tags_businesses SET subscription_status=?,updated_at=NOW() WHERE id=? AND plan_id=?", [nextStatus, subscription.business_id, subscription.plan_id]);
    await conn.query("UPDATE tags_business_addons SET status=?,updated_at=NOW() WHERE business_id=? AND addon_code='directory'", [addonStatus, subscription.business_id]);
    await conn.query("UPDATE tags_directory_listings SET status=?,updated_at=NOW() WHERE business_id=?", [listingStatus, subscription.business_id]);
    await conn.query(`UPDATE tags_directory_site_listings dsl INNER JOIN tags_directory_listings dl ON dl.id=dsl.listing_id SET dsl.publication_status=?,dsl.updated_at=NOW() WHERE dl.business_id=?`, [publicationStatus, subscription.business_id]);
    await conn.commit();
    return Response.json({ ok: true, status: nextStatus });
  } catch (error) {
    await conn.rollback();
    console.error("DIRECTORY SUBSCRIPTION ACTION ERROR", error);
    return Response.json({ error: "No se pudo actualizar la suscripción" }, { status: 500 });
  } finally { conn.release(); }
}

async function createSubscription(req, body, access) {
  const businessId = Number(body?.businessId || 0);
  const siteId = Number(body?.siteId || 0);
  const planId = Number(body?.planId || 0);
  const requestedDuration = [1, 3, 6, 12].includes(Number(body?.durationMonths)) ? Number(body.durationMonths) : 1;
  const paymentState = ["received", "pending", "unpaid"].includes(body?.paymentState) ? body.paymentState : "pending";
  const provider = ["manual", "transfer", "mercadopago"].includes(body?.provider) ? body.provider : "manual";
  const durationMonths = provider === "mercadopago" ? 1 : requestedDuration;
  const startedAt = body?.startedAt ? new Date(`${body.startedAt}T12:00:00`) : new Date();
  if (!businessId || !siteId || !planId || Number.isNaN(startedAt.getTime())) return Response.json({ error: "Faltan cliente, Directorio, plan o fecha" }, { status: 400 });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[plan]] = await conn.query("SELECT * FROM tags_plans WHERE id=? AND code IN ('directory_web','directory_web_plus') AND is_active=1 LIMIT 1", [planId]);
    const [[listing]] = await conn.query(`SELECT l.id,l.qr_page_id,sl.id site_listing_id,sl.slug site_slug,ds.name site_name,ds.primary_host,ds.brand_config,b.name business_name,b.email business_email FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.site_id=? INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id INNER JOIN tags_businesses b ON b.id=l.business_id WHERE l.business_id=? LIMIT 1 FOR UPDATE`, [siteId, businessId]);
    if (!plan || !listing) { await conn.rollback(); return Response.json({ error: "El cliente debe tener una ficha asignada a ese Directorio" }, { status: 409 }); }
    const configuredAmount = await configuredPrice(conn, { siteId, planId, durationMonths, provider });
    const requestedAmount = Number(body?.amount);
    const amount = provider === "mercadopago" ? configuredAmount : (Number.isFinite(requestedAmount) && requestedAmount > 0 ? requestedAmount : configuredAmount);
    if (amount == null || amount <= 0) { await conn.rollback(); return Response.json({ error: "El plan no tiene un precio configurado para esa modalidad" }, { status: 409 }); }

    const [previousAutomatic] = await conn.query("SELECT external_subscription_id FROM tags_subscriptions s INNER JOIN tags_plans p ON p.id=s.plan_id WHERE s.business_id=? AND s.payment_provider='mercadopago' AND s.external_subscription_id IS NOT NULL AND s.status<>'cancelled' AND p.code IN ('directory_web','directory_web_plus') FOR UPDATE", [businessId]);
    for (const previous of previousAutomatic) await updateDirectoryMercadoPagoPreapproval(previous.external_subscription_id, "cancelled");
    await conn.query("UPDATE tags_subscriptions s INNER JOIN tags_plans p ON p.id=s.plan_id SET s.status='cancelled',s.cancelled_at=NOW(),s.updated_at=NOW() WHERE s.business_id=? AND p.code IN ('directory_web','directory_web_plus') AND s.status<>'cancelled'", [businessId]);
    const active = provider !== "mercadopago" && paymentState === "received";
    const pending = provider === "mercadopago" || paymentState === "pending";
    const status = active ? "active" : pending ? "trial" : "inactive";
    const expiresAt = active ? addMonths(startedAt, durationMonths) : pending ? new Date(Date.now() + 72 * 60 * 60 * 1000) : null;
    const [result] = await conn.query(`INSERT INTO tags_subscriptions (business_id,plan_id,status,payment_provider,amount,currency,started_at,expires_at,duration_months,source,next_billing_at,auto_renew,auto_disable_on_expire,grace_days,created_at,updated_at) VALUES (?,?,?,?,?,'ARS',?,?,?,'manual',?,?,1,0,NOW(),NOW())`, [businessId, planId, status, provider, amount, startedAt, expiresAt, durationMonths, expiresAt, provider === "mercadopago" ? 1 : 0]);
    const subscriptionId = result.insertId;
    if (pending && provider !== "mercadopago") await conn.query(`INSERT INTO tags_subscription_payments (subscription_id,business_id,plan_id,amount,currency,provider,status,paid_at,period_start,period_end,notes,created_by,created_at) VALUES (?,?,?,?,'ARS',?,'pending',NULL,NULL,NULL,'Pendiente de acreditación',?,NOW())`, [subscriptionId, businessId, planId, amount, provider, Number(access.session?.businessId || 0) || null]);
    const [[addon]] = await conn.query("SELECT id FROM tags_business_addons WHERE business_id=? AND addon_code='directory' ORDER BY id DESC LIMIT 1 FOR UPDATE", [businessId]);
    if (addon) await conn.query("UPDATE tags_business_addons SET status=?,started_at=?,expires_at=?,amount=?,currency='ARS',updated_at=NOW() WHERE id=?", [status === "inactive" ? "inactive" : "active", startedAt, expiresAt, amount, addon.id]);
    else await conn.query("INSERT INTO tags_business_addons (business_id,addon_code,quantity,status,started_at,expires_at,amount,currency,notes,created_at,updated_at) VALUES (?,'directory',1,?,?,?,?, 'ARS','Suscripción creada desde Directorios',NOW(),NOW())", [businessId, status === "inactive" ? "inactive" : "active", startedAt, expiresAt, amount]);
    await conn.query("UPDATE tags_businesses SET plan_id=?,subscription_status=?,plan_started_at=?,plan_expires_at=?,updated_at=NOW() WHERE id=?", [planId, status, startedAt, expiresAt, businessId]);
    await conn.query("UPDATE tags_directory_listings SET status=?,updated_at=NOW() WHERE id=?", [status === "inactive" ? "suspended" : "published", listing.id]);
    await conn.query("UPDATE tags_directory_site_listings SET is_free=0,publication_status=?,published_at=COALESCE(published_at,NOW()),updated_at=NOW() WHERE id=?", [status === "inactive" ? "hidden" : "published", listing.site_listing_id]);
    if (active) await conn.query(`INSERT INTO tags_subscription_payments (subscription_id,business_id,plan_id,amount,currency,provider,status,paid_at,period_start,period_end,notes,created_by,created_at) VALUES (?,?,?,?,'ARS',?,'approved',NOW(),?,?,?, ?,NOW())`, [subscriptionId, businessId, planId, amount, provider, startedAt, expiresAt, "Imputado al crear la suscripción", Number(access.session?.businessId || 0) || null]);
    if (status !== "inactive") {
      const protocol = req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "development" ? "http" : "https");
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
      const origin = `${protocol}://${host}`;
      await activateDirectoryWebForBusiness({ conn, businessId, siteId, origin });
      if (plan.code === "directory_web_plus") {
        const [[reviewsAddon]] = await conn.query("SELECT id FROM tags_business_addons WHERE business_id=? AND addon_code='client_reviews' ORDER BY id DESC LIMIT 1 FOR UPDATE", [businessId]);
        if (reviewsAddon) {
          await conn.query("UPDATE tags_business_addons SET status='active',quantity=1,started_at=?,expires_at=?,amount=0,currency='ARS',notes=?,updated_at=NOW() WHERE id=?", [startedAt, expiresAt, `Incluido en ${plan.name}`, reviewsAddon.id]);
        } else {
          await conn.query("INSERT INTO tags_business_addons (business_id,addon_code,quantity,status,started_at,expires_at,amount,currency,notes,created_at,updated_at) VALUES (?,'client_reviews',1,'active',?,?,0,'ARS',?,NOW(),NOW())", [businessId, startedAt, expiresAt, `Incluido en ${plan.name}`]);
        }
        await activateClientReviewsForBusiness({
          conn,
          businessId,
          title: `¿Cómo fue tu experiencia en ${listing.business_name}?`,
          slug: `${listing.site_slug || `negocio-${businessId}`}-opiniones`,
          baseUrl: origin,
          allowTrial: true
        });
      }
    }
    await conn.commit();
    const mpSubscription = provider === "mercadopago" ? await ensureDirectoryMercadoPagoSubscription({ subscriptionId, baseUrl: directoryMercadoPagoBaseUrl(req) }) : null;
    const brand = directoryEmailBranding(listing);
    const stateText = mpSubscription ? "Tu suscripción automática fue creada. Para activarla tenés que autorizar los débitos mensuales en Mercado Pago." : active ? `Tu suscripción está activa hasta el ${expiresAt.toLocaleDateString("es-AR")}.` : pending ? "Tu Web quedó activa durante 72 horas mientras aguardamos la acreditación del pago." : "La suscripción fue registrada y se activará cuando se impute el pago.";
    const contactBlock = directoryEmailContact(brand, { manualPayment: provider !== "mercadopago" && paymentState !== "received" });
    await sendMail({ to: listing.business_email, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject: `${plan.name} · ${brand.name}`, text: `${stateText} Importe: ARS ${amount}. ${contactBlock.text}`, html: `<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226;border:1px solid #dce9e1;border-radius:16px;overflow:hidden">${directoryEmailHeader(brand, "Confirmación de suscripción")}<main style="padding:24px"><p>Hola <strong>${listing.business_name}</strong>,</p><p>${stateText}</p><p><strong>Plan:</strong> ${plan.name}<br><strong>Período:</strong> ${durationMonths} mes(es)<br><strong>Importe:</strong> ARS ${amount.toLocaleString("es-AR")}</p>${mpSubscription?.init_point ? `<p style="text-align:center"><a href="${mpSubscription.init_point}" style="display:inline-block;padding:13px 20px;background:${brand.color};color:#fff;text-decoration:none;border-radius:9px;font-weight:bold">Autorizar suscripción en Mercado Pago</a></p>` : ""}${contactBlock.html}</main></div>` });
    return Response.json({ ok: true, subscriptionId, status, expiresAt, checkoutUrl: mpSubscription?.init_point || null });
  } catch (error) {
    await conn.rollback();
    console.error("DIRECTORY SUBSCRIPTION CREATE ERROR", error);
    return Response.json({ error: error.message || "No se pudo crear la suscripción" }, { status: error.status || 500 });
  } finally { conn.release(); }
}
