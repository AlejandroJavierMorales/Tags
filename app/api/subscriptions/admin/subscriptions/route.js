export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireSubscriptionAdmin, subscriptionAdminError } from "@/app/modules/subscriptions/lib/requireSubscriptionAdmin";
import { createAdminSubscription } from "@/app/modules/subscriptions/lib/adminSubscriptionService";
import { ensureMercadoPagoSubscription } from "@/app/modules/subscriptions/lib/subscriptionMercadoPago";
import { getRequestBaseUrl } from "@/app/lib/channelContext";
import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";
import { directoryEmailBranding, directoryEmailHeader } from "@/app/modules/directory/lib/directoryEmailBranding";

const escapeHtml = value => String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

async function notifySubscriptionState({ businessId, planId, status, previousStatus }) {
  if (status === previousStatus || !["inactive", "active", "cancelled", "past_due"].includes(status)) return;
  const [[context]] = await db.query(`SELECT b.name,b.email,p.name plan_name,ds.name site_name,ds.primary_host,ds.brand_config FROM tags_businesses b INNER JOIN tags_plans p ON p.id=? LEFT JOIN tags_directory_listings l ON l.business_id=b.id LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id LEFT JOIN tags_directory_sites ds ON ds.id=sl.site_id WHERE b.id=? ORDER BY ds.id LIMIT 1`, [planId, businessId]);
  if (!context) return;
  const brand = directoryEmailBranding(context.site_name ? { name: context.site_name, primary_host: context.primary_host, brand_config: context.brand_config } : { name: "Tags", primary_host: "tags.com.ar", brand_config: null });
  const stateText = status === "inactive" ? "Tu suscripción fue pausada. Los productos incluidos se encuentran momentáneamente fuera de servicio hasta su reactivación." : status === "active" ? "Tu suscripción fue reactivada y los productos incluidos vuelven a estar disponibles." : status === "past_due" ? "Tu suscripción registra un pago pendiente. Regularizá la situación para evitar la interrupción del servicio." : "Tu suscripción fue cancelada y los productos incluidos dejaron de estar disponibles.";
  const subject = `${status === "active" ? "Suscripción reactivada" : status === "past_due" ? "Pago pendiente" : "Suscripción pausada"} · ${brand.name}`;
  const html = `<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226;border:1px solid #dce9e1;border-radius:16px;overflow:hidden">${directoryEmailHeader(brand, subject)}<main style="padding:24px"><p>Hola <strong>${escapeHtml(context.name)}</strong>,</p><p>${escapeHtml(stateText)}</p><p><strong>Plan:</strong> ${escapeHtml(context.plan_name)}</p></main></div>`;
  if (context.email) await sendMail({ to: context.email, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject, text: `${stateText} Plan: ${context.plan_name}.`, html });
  const [admins] = await db.query("SELECT email FROM tags_businesses WHERE role='admin' AND email IS NOT NULL");
  const recipients = [...new Set([brand.notificationEmail, ...admins.map(item => item.email)].filter(Boolean))];
  if (recipients.length) await sendMail({ to: recipients, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject: `${subject} · ${context.name}`, text: `${context.name}: ${stateText}`, html });
}

async function notifySubscriptionChange({ businessId, planId, status, provider, amount, expiresAt, durationMonths, checkoutUrl }) {
  const [[context]] = await db.query(`SELECT b.name,b.email,p.name plan_name,ds.name site_name,ds.primary_host,ds.brand_config FROM tags_businesses b INNER JOIN tags_plans p ON p.id=? LEFT JOIN tags_directory_listings l ON l.business_id=b.id LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id LEFT JOIN tags_directory_sites ds ON ds.id=sl.site_id WHERE b.id=? ORDER BY ds.id LIMIT 1`, [planId, businessId]);
  if (!context) return;
  const brand = directoryEmailBranding(context.site_name ? { name: context.site_name, primary_host: context.primary_host, brand_config: context.brand_config } : { name: "Tags", primary_host: "tags.com.ar", brand_config: null });
  const providerLabel = provider === "mercadopago" ? "Mercado Pago automático" : provider === "transfer" ? "Transferencia" : "Pago manual";
  const stateLabel = status === "active" ? "Activa" : status === "trial" ? "Prueba / gracia" : status === "past_due" ? "Con deuda" : status === "inactive" ? "Suspendida" : status === "cancelled" ? "Cancelada" : status;
  const expiryLabel = expiresAt ? new Date(expiresAt).toLocaleDateString("es-AR") : "Sin vencimiento";
  const manual = provider !== "mercadopago" ? `<p><strong>Datos para pagar:</strong><br>Titular: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_HOLDER || "")}<br>Alias: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_ALIAS || "")}<br>CBU/CVU: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_CBU || "")}<br>Cuenta: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_ACCOUNT || "")}</p>` : "";
  const subject = `Actualización de suscripción · ${brand.name}`;
  const paymentLink = checkoutUrl ? `<p><a href="${escapeHtml(checkoutUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#168b58;color:#fff;text-decoration:none;font-weight:700">Continuar con el pago</a></p>` : "";
  const text = `Plan: ${context.plan_name}. Estado: ${stateLabel}. Modalidad: ${providerLabel}. Importe: ARS ${Number(amount || 0).toLocaleString("es-AR")}. Duración: ${durationMonths || 1} meses. Vencimiento: ${expiryLabel}.${checkoutUrl ? ` Pago online: ${checkoutUrl}` : ""}`;
  const html = `<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226;border:1px solid #dce9e1;border-radius:16px;overflow:hidden">${directoryEmailHeader(brand, "Actualización de suscripción")}<main style="padding:24px"><p>Hola <strong>${escapeHtml(context.name)}</strong>,</p><p>La suscripción fue actualizada.</p><p><strong>Plan:</strong> ${escapeHtml(context.plan_name)}<br><strong>Estado:</strong> ${escapeHtml(stateLabel)}<br><strong>Modalidad:</strong> ${escapeHtml(providerLabel)}<br><strong>Importe:</strong> ARS ${Number(amount || 0).toLocaleString("es-AR")}<br><strong>Duración:</strong> ${durationMonths || 1} meses<br><strong>Vencimiento:</strong> ${expiryLabel}</p>${manual}${paymentLink}</main></div>`;
  if (context.email) await sendMail({ to: context.email, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject, text, html });
  const [admins] = await db.query("SELECT email FROM tags_businesses WHERE role='admin' AND email IS NOT NULL");
  const recipients = [...new Set([brand.notificationEmail, ...admins.map(item => item.email)].filter(Boolean))];
  if (recipients.length) await sendMail({ to: recipients, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject: `${subject} · Plataforma`, text, html });
}

export async function POST(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  try {
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    const origin = String(getRequestBaseUrl(req) || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/+$/, "");
    const result = await createAdminSubscription({ ...body, origin }, Number(access.session?.businessId || access.session?.id || 0) || null);
    let paymentUrl = null;
    if (result.requiresMercadoPago) {
      const mp = await ensureMercadoPagoSubscription(result.subscriptionId, origin);
      paymentUrl = mp.init_point;
    }
    return Response.json({ ok: true, ...result, paymentUrl });
  } catch (error) {
    console.error("SUBSCRIPTION CENTER CREATE ERROR", error);
    return Response.json({ ok: false, error: error?.message || "No se pudo crear la suscripción" }, { status: error?.status || 500 });
  }
}

export async function PUT(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  const body = await req.json().catch(() => null);
  const id = Number(body?.id || 0);
  const status = String(body?.status || "");
  const allowedStatuses = new Set(["active", "trial", "past_due", "inactive", "cancelled"]);
  const amount = Number(body?.amount);
  const expiresAt = body?.expiresAt || null;
  const requestedPlanId = Number(body?.planId || 0);
  const requestedProvider = ["manual", "transfer", "mercadopago"].includes(String(body?.paymentProvider)) ? String(body.paymentProvider) : null;
  const requestedDuration = Number(body?.durationMonths) >= 1 && Number(body?.durationMonths) <= 12 ? Number(body.durationMonths) : null;
  if (!id || !allowedStatuses.has(status) || !Number.isFinite(amount) || amount < 0) {
    return Response.json({ ok: false, error: "Suscripción, estado e importe son obligatorios" }, { status: 400 });
  }
  const conn = await db.getConnection();
  let changedSubscription = null;
  try {
    await conn.beginTransaction();
    const [[subscription]] = await conn.query("SELECT id,business_id,plan_id,status,amount,currency,expires_at,payment_provider,duration_months FROM tags_subscriptions WHERE id=? LIMIT 1 FOR UPDATE", [id]);
    if (!subscription) throw Object.assign(new Error("Suscripción inexistente"), { status: 404 });
    const effectivePlanId = requestedPlanId || Number(subscription.plan_id);
    const [[plan]] = await conn.query("SELECT id,is_active FROM tags_plans WHERE id=? LIMIT 1", [effectivePlanId]);
    if (!plan || Number(plan.is_active) !== 1) throw Object.assign(new Error("El plan seleccionado no existe o está inactivo"), { status: 400 });
    const effectiveProvider = requestedProvider || subscription.payment_provider || "manual";
    const effectiveDuration = requestedDuration || Number(subscription.duration_months || 1);
    await conn.query("UPDATE tags_subscriptions SET plan_id=?,status=?,amount=?,payment_provider=?,duration_months=?,expires_at=?,next_billing_at=?,auto_renew=?,updated_at=NOW() WHERE id=?", [effectivePlanId, status, amount, effectiveProvider, effectiveDuration, expiresAt, effectiveProvider === "mercadopago" ? expiresAt : null, effectiveProvider === "mercadopago" ? 1 : 0, id]);
    const addonStatus = ["active", "trial"].includes(status) ? "active" : "inactive";
    await conn.query(`UPDATE tags_business_addons ba INNER JOIN tags_subscription_addon_grants g ON g.business_addon_id=ba.id SET ba.status=?,ba.expires_at=?,ba.updated_at=NOW(),g.status=?,g.expires_at=?,g.updated_at=NOW() WHERE g.subscription_id=?`, [addonStatus, expiresAt, addonStatus, expiresAt, id]);
    const [[profile]] = await conn.query("SELECT current_version_id FROM tags_plan_profiles WHERE plan_id=? AND status='active' LIMIT 1", [effectivePlanId]);
    if (profile?.current_version_id) {
      await conn.query("UPDATE tags_subscription_addon_grants g INNER JOIN tags_business_addons ba ON ba.id=g.business_addon_id SET g.status='inactive',g.expires_at=?,g.updated_at=NOW(),ba.status='inactive',ba.expires_at=?,ba.updated_at=NOW() WHERE g.subscription_id=?", [expiresAt, expiresAt, id]);
      const [planAddons] = await conn.query("SELECT addon_code,quantity,entitlement_config_json FROM tags_plan_version_addons WHERE plan_version_id=?", [profile.current_version_id]);
      for (const addon of planAddons) {
        const [[existingAddon]] = await conn.query("SELECT id FROM tags_business_addons WHERE business_id=? AND addon_code=? ORDER BY id DESC LIMIT 1", [subscription.business_id, addon.addon_code]);
        let businessAddonId = existingAddon?.id;
        if (businessAddonId) await conn.query("UPDATE tags_business_addons SET quantity=?,status=?,expires_at=?,updated_at=NOW() WHERE id=?", [Number(addon.quantity || 1), addonStatus, expiresAt, businessAddonId]);
        else { const [createdAddon] = await conn.query("INSERT INTO tags_business_addons (business_id,addon_code,quantity,status,expires_at,amount,currency,notes,created_at,updated_at) VALUES (?,?,?, ?,?,0,?,'Asignado por suscripción',NOW(),NOW())", [subscription.business_id, addon.addon_code, Number(addon.quantity || 1), addonStatus, expiresAt, subscription.currency || "ARS"]); businessAddonId = createdAddon.insertId; }
        const [[grant]] = await conn.query("SELECT id FROM tags_subscription_addon_grants WHERE subscription_id=? AND addon_code=? LIMIT 1", [id, addon.addon_code]);
        if (grant) await conn.query("UPDATE tags_subscription_addon_grants SET business_addon_id=?,quantity=?,status=?,starts_at=COALESCE(starts_at,NOW()),expires_at=?,entitlement_snapshot_json=?,updated_at=NOW() WHERE id=?", [businessAddonId, Number(addon.quantity || 1), addonStatus, expiresAt, addon.entitlement_config_json || "{}", grant.id]);
        else await conn.query("INSERT INTO tags_subscription_addon_grants (subscription_id,business_id,business_addon_id,addon_code,quantity,status,starts_at,expires_at,entitlement_snapshot_json) VALUES (?,?,?,?,?,?,NOW(),?,?)", [id, subscription.business_id, businessAddonId, addon.addon_code, Number(addon.quantity || 1), addonStatus, expiresAt, addon.entitlement_config_json || "{}"]);
      }
    }
    await conn.query("UPDATE tags_businesses SET plan_id=?,subscription_status=?,plan_expires_at=?,updated_at=NOW() WHERE id=?", [effectivePlanId, status, expiresAt, subscription.business_id]);
    await conn.query("UPDATE tags_subscription_payments SET plan_id=?,amount=?,updated_at=NOW() WHERE subscription_id=? AND status='pending'", [effectivePlanId, amount, id]);
    await conn.query("INSERT INTO tags_subscription_audit_events (subscription_id,business_id,event_code,actor_type,actor_id,previous_state_json,next_state_json) VALUES (?,?,?,'admin',?,?,?)", [id, subscription.business_id, status === "inactive" ? "subscription.suspended" : status === "active" && subscription.status === "inactive" ? "subscription.reactivated" : "subscription.updated", Number(access.session?.businessId || 0) || null, JSON.stringify({status:subscription.status,amount:subscription.amount,expiresAt:subscription.expires_at}), JSON.stringify({status,amount,expiresAt})]);
    changedSubscription = { businessId: subscription.business_id, planId: effectivePlanId, status, previousStatus: subscription.status };
    await conn.commit();
    let checkoutUrl = null;
    if (effectiveProvider === "mercadopago") {
      const origin = String(getRequestBaseUrl(req) || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/+$/, "");
      const mp = await ensureMercadoPagoSubscription(id, origin);
      checkoutUrl = mp?.init_point || null;
    }
    await notifySubscriptionState(changedSubscription).catch(error => console.error("SUBSCRIPTION STATE NOTIFICATION ERROR", error));
    await notifySubscriptionChange({ businessId: subscription.business_id, planId: effectivePlanId, status, provider: effectiveProvider, amount, expiresAt, durationMonths: effectiveDuration, checkoutUrl }).catch(error => console.error("SUBSCRIPTION CHANGE NOTIFICATION ERROR", error));
    return Response.json({ ok: true, planId: effectivePlanId, paymentProvider: effectiveProvider, durationMonths: effectiveDuration, checkoutUrl });
  } catch (error) {
    await conn.rollback();
    console.error("SUBSCRIPTION CENTER UPDATE ERROR", error);
    return Response.json({ ok: false, error: error?.message || "No se pudo editar la suscripción" }, { status: error?.status || 500 });
  } finally { conn.release(); }
}

export async function DELETE(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  const id = Number(new URL(req.url).searchParams.get("id") || 0);
  if (!id) return Response.json({ ok: false, error: "Falta la suscripción" }, { status: 400 });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[subscription]] = await conn.query("SELECT business_id FROM tags_subscriptions WHERE id=? LIMIT 1 FOR UPDATE", [id]);
    if (!subscription) throw Object.assign(new Error("Suscripción inexistente"), { status: 404 });
    const [grants] = await conn.query("SELECT business_addon_id FROM tags_subscription_addon_grants WHERE subscription_id=?", [id]);
    await conn.query("DELETE FROM tags_subscription_payments WHERE subscription_id=?", [id]);
    await conn.query("INSERT INTO tags_subscription_audit_events (subscription_id,business_id,event_code,actor_type,actor_id,previous_state_json) VALUES (?,?,'subscription.deleted','admin',?,?)", [id, subscription.business_id, Number(access.session?.businessId || 0) || null, JSON.stringify(subscription)]);
    await conn.query("DELETE FROM tags_subscription_terms WHERE subscription_id=?", [id]);
    await conn.query("DELETE FROM tags_subscription_addon_grants WHERE subscription_id=?", [id]);
    for (const grant of grants) await conn.query("DELETE FROM tags_business_addons WHERE id=?", [grant.business_addon_id]);
    await conn.query("DELETE FROM tags_subscriptions WHERE id=?", [id]);
    const [[latest]] = await conn.query("SELECT plan_id,status,expires_at FROM tags_subscriptions WHERE business_id=? ORDER BY id DESC LIMIT 1", [subscription.business_id]);
    await conn.query("UPDATE tags_businesses SET plan_id=?,subscription_status=?,plan_expires_at=?,updated_at=NOW() WHERE id=?", [latest?.plan_id || null, latest?.status || null, latest?.expires_at || null, subscription.business_id]);
    await conn.commit();
    return Response.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    console.error("SUBSCRIPTION CENTER DELETE ERROR", error);
    return Response.json({ ok: false, error: error?.message || "No se pudo eliminar la suscripción" }, { status: error?.status || 500 });
  } finally { conn.release(); }
}
