import crypto from "crypto";
import { db } from "@/app/lib/tags-db";

const clean = (value, max = 190) => String(value || "").trim().slice(0, max);
const hash = token => crypto.createHash("sha256").update(String(token || "")).digest("hex");
const addDays = (value, days) => { const result = new Date(value); result.setDate(result.getDate() + Number(days || 0)); return result; };
const addMonths = (value, months) => { const result = new Date(value); result.setMonth(result.getMonth() + Number(months || 1)); return result; };
const parse = value => { if (!value) return {}; if (typeof value === "object") return value; try { return JSON.parse(value); } catch { return {}; } };

export async function createSubscriptionOffer(input, actorId = null) {
  const conn = await db.getConnection();
  try {
    const businessId = Number(input?.businessId || 0) || null;
    const planVersionId = Number(input?.planVersionId || 0);
    const priceId = Number(input?.priceId || 0);
    const expiresDays = Math.min(30, Math.max(1, Number(input?.expiresDays || 7)));
    const graceDays = Math.min(30, Math.max(0, Number(input?.graceDays || 0)));
    if (!businessId || !planVersionId || !priceId) throw Object.assign(new Error("Cliente, versión y precio son obligatorios"), { status: 400 });
    await conn.beginTransaction();
    const [[business]] = await conn.query(`SELECT b.id,b.name,b.email,(SELECT sl.site_id FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id WHERE l.business_id=b.id ORDER BY sl.id LIMIT 1) directory_site_id FROM tags_businesses b WHERE b.id=? LIMIT 1`, [businessId]);
    if (!business) throw Object.assign(new Error("Cliente inexistente"), { status: 404 });
    const [[version]] = await conn.query(`SELECT v.*,p.code plan_code,p.max_qr_codes,pr.visibility,pr.owner_business_id FROM tags_plan_versions v INNER JOIN tags_plans p ON p.id=v.plan_id INNER JOIN tags_plan_profiles pr ON pr.plan_id=p.id WHERE v.id=? AND v.status='active' AND p.is_active=1 LIMIT 1 FOR UPDATE`, [planVersionId]);
    if (!version) throw Object.assign(new Error("La versión del plan no está activa"), { status: 404 });
    if (version.visibility === "private" && Number(version.owner_business_id || 0) !== businessId) {
      const [[assignment]] = await conn.query("SELECT id FROM tags_plan_business_assignments WHERE plan_id=? AND business_id=? AND status='active' LIMIT 1", [version.plan_id,businessId]);
      if (!assignment) throw Object.assign(new Error("El plan privado no está asignado a este cliente"), { status: 403 });
    }
    const [[price]] = await conn.query("SELECT * FROM tags_plan_version_prices WHERE id=? AND plan_version_id=? AND is_active=1 LIMIT 1", [priceId,planVersionId]);
    if (!price) throw Object.assign(new Error("Precio inexistente o inactivo"), { status: 404 });
    const priceSettings = parse(price.settings_json);
    if (priceSettings.siteId && Number(priceSettings.siteId) !== Number(business.directory_site_id || 0)) {
      throw Object.assign(new Error("El precio seleccionado pertenece a otro Directorio"), { status: 409 });
    }
    const [addons] = await conn.query("SELECT addon_code,quantity,entitlement_config_json FROM tags_plan_version_addons WHERE plan_version_id=? ORDER BY addon_code", [planVersionId]);
    const snapshot = {
      schemaVersion: 1,
      plan: { id:Number(version.plan_id),versionId:Number(version.id),version:Number(version.version_number),code:version.plan_code,name:version.name,description:version.description,maxQrCodes:Number(version.max_qr_codes||0),features:parse(version.feature_snapshot_json) },
      price: { id:Number(price.id),code:price.price_code,billingMode:price.billing_mode,provider:price.provider,durationMonths:Number(price.duration_months||1),calendarMonth:price.calendar_month?Number(price.calendar_month):null,amount:Number(price.amount||0),currency:price.currency||version.currency||"ARS",settings:priceSettings },
      addons: addons.map(item=>({ code:item.addon_code,quantity:Number(item.quantity||1),config:parse(item.entitlement_config_json) })),
      policy: { graceDays,provisionalAccess:input?.provisionalAccess===true },
      customer: { businessId, email:business.email },
      createdAt:new Date().toISOString()
    };
    const token = crypto.randomBytes(32).toString("base64url");
    const [result] = await conn.query(`INSERT INTO tags_subscription_offers (business_id,customer_email,plan_id,plan_version_id,price_id,status,billing_mode,payment_provider,duration_months,amount,currency,token_hash,expires_at,created_by,terms_snapshot_json,metadata_json) VALUES (?,?,?,?,?,'sent',?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL ? DAY),?,?,?)`, [businessId,business.email,version.plan_id,version.id,price.id,price.billing_mode,price.billing_mode==="recurring"?(price.provider||"mercadopago"):"manual",price.duration_months,price.amount,price.currency,hash(token),expiresDays,actorId,JSON.stringify(snapshot),JSON.stringify({})]);
    await conn.query("INSERT INTO tags_subscription_audit_events (business_id,offer_id,event_code,actor_type,actor_id,next_state_json,context_json) VALUES (?,?,'offer.created','admin',?,?,?)", [businessId,result.insertId,actorId,JSON.stringify({status:"sent"}),JSON.stringify({planVersionId,priceId})]);
    await conn.commit();
    return { id:Number(result.insertId),token,expiresAt:addDays(new Date(),expiresDays),snapshot };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}

export async function getSubscriptionOffer(token, { markOpened = false } = {}) {
  const [[offer]] = await db.query(`SELECT o.*,b.name business_name,b.email business_email,p.name plan_name FROM tags_subscription_offers o LEFT JOIN tags_businesses b ON b.id=o.business_id INNER JOIN tags_plans p ON p.id=o.plan_id WHERE o.token_hash=? LIMIT 1`, [hash(token)]);
  if (!offer) return null;
  const expired = new Date(offer.expires_at) < new Date();
  if (expired && !["accepted","cancelled"].includes(offer.status)) await db.query("UPDATE tags_subscription_offers SET status='expired',updated_at=NOW() WHERE id=?", [offer.id]);
  else if (markOpened && offer.status === "sent") await db.query("UPDATE tags_subscription_offers SET status='opened',updated_at=NOW() WHERE id=?", [offer.id]);
  return { ...offer, status:expired&&!(["accepted","cancelled"].includes(offer.status))?"expired":offer.status, snapshot:parse(offer.terms_snapshot_json) };
}

async function createAddonGrants(conn, subscription, snapshot, activeUntil = null) {
  const active = Boolean(activeUntil);
  for (const addon of snapshot.addons || []) {
    const [addonResult] = await conn.query(`INSERT INTO tags_business_addons (business_id,addon_code,quantity,status,started_at,expires_at,amount,currency,notes,created_at,updated_at) VALUES (?,?,?, ?,?,?,?,?,?,NOW(),NOW())`, [subscription.businessId,addon.code,Math.max(1,Number(addon.quantity||1)),active?"active":"inactive",active?new Date():null,activeUntil,0,snapshot.price?.currency||"ARS",`Incluido en ${snapshot.plan?.name||"plan"} · suscripción ${subscription.id}`]);
    await conn.query(`INSERT INTO tags_subscription_addon_grants (subscription_id,business_id,business_addon_id,addon_code,quantity,status,starts_at,expires_at,entitlement_snapshot_json) VALUES (?,?,?,?,?,?,?, ?,?)`, [subscription.id,subscription.businessId,addonResult.insertId,addon.code,Math.max(1,Number(addon.quantity||1)),active?"active":"pending",active?new Date():null,activeUntil,JSON.stringify(addon)]);
  }
}

export async function acceptSubscriptionOffer(token) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[offer]] = await conn.query("SELECT * FROM tags_subscription_offers WHERE token_hash=? LIMIT 1 FOR UPDATE", [hash(token)]);
    if (!offer) throw Object.assign(new Error("Oferta inexistente"), { status:404 });
    if (offer.status === "cancelled" || offer.status === "expired" || new Date(offer.expires_at)<new Date()) throw Object.assign(new Error("La oferta ya no está disponible"), { status:410 });
    if (offer.subscription_id) { await conn.commit(); return { subscriptionId:Number(offer.subscription_id),reused:true,paymentProvider:offer.payment_provider }; }
    if (!offer.business_id) throw Object.assign(new Error("La oferta todavía no tiene un cliente asociado"), { status:409 });
    const snapshot=parse(offer.terms_snapshot_json),graceDays=Math.max(0,Number(snapshot.policy?.graceDays||0)),provisional=snapshot.policy?.provisionalAccess===true&&graceDays>0,now=new Date(),trialEnd=provisional?addDays(now,graceDays):null;
    const [result] = await conn.query(`INSERT INTO tags_subscriptions (business_id,plan_id,status,payment_provider,amount,currency,started_at,expires_at,duration_months,source,next_billing_at,auto_renew,auto_disable_on_expire,grace_days,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'manual',?,?,1,?,NOW(),NOW())`, [offer.business_id,offer.plan_id,provisional?"trial":"inactive",offer.payment_provider,offer.amount,offer.currency,provisional?now:null,trialEnd,offer.duration_months,trialEnd,offer.billing_mode==="recurring"?1:0,graceDays]);
    const subscriptionId=Number(result.insertId);
    await conn.query("INSERT INTO tags_subscription_terms (subscription_id,plan_version_id,offer_id,price_code,billing_mode,terms_snapshot_json) VALUES (?,?,?,?,?,?)", [subscriptionId,offer.plan_version_id,offer.id,snapshot.price?.code||null,offer.billing_mode,JSON.stringify(snapshot)]);
    await createAddonGrants(conn,{id:subscriptionId,businessId:Number(offer.business_id)},snapshot,trialEnd);
    if (offer.billing_mode==="manual") await conn.query(`INSERT INTO tags_subscription_payments (subscription_id,business_id,plan_id,amount,currency,provider,status,paid_at,period_start,period_end,notes,created_at) VALUES (?,?,?,?,?,'manual','pending',NULL,NULL,NULL,'Oferta aceptada · pendiente de acreditación',NOW())`, [subscriptionId,offer.business_id,offer.plan_id,offer.amount,offer.currency]);
    if (provisional) await conn.query("UPDATE tags_businesses SET plan_id=?,subscription_status='trial',plan_started_at=?,plan_expires_at=?,updated_at=NOW() WHERE id=?", [offer.plan_id,now,trialEnd,offer.business_id]);
    await conn.query("UPDATE tags_subscription_offers SET status='accepted',accepted_at=NOW(),subscription_id=?,updated_at=NOW() WHERE id=?", [subscriptionId,offer.id]);
    await conn.query("INSERT INTO tags_subscription_audit_events (subscription_id,business_id,offer_id,event_code,actor_type,next_state_json,context_json) VALUES (?,?,?,'offer.accepted','customer',?,?)", [subscriptionId,offer.business_id,offer.id,JSON.stringify({status:provisional?"trial":"pending_payment"}),JSON.stringify({paymentProvider:offer.payment_provider})]);
    await conn.commit();
    return { subscriptionId,reused:false,paymentProvider:offer.payment_provider,provisional,trialEnd };
  } catch(error){await conn.rollback();throw error}finally{conn.release()}
}
