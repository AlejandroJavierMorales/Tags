export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireSubscriptionAdmin, subscriptionAdminError } from "@/app/modules/subscriptions/lib/requireSubscriptionAdmin";
import { createAdminSubscription, resolveAdminSubscriptionSelection } from "@/app/modules/subscriptions/lib/adminSubscriptionService";
import { inspectExistingMercadoPagoSubscription, reconcileMercadoPagoSubscription } from "@/app/modules/subscriptions/lib/subscriptionMercadoPagoReconciliation";
import { searchSubscriptionMercadoPagoPreapprovals } from "@/app/modules/subscriptions/lib/subscriptionMercadoPago";
import { getRequestBaseUrl } from "@/app/lib/channelContext";

const publicSummary = ({ resource, latestApprovedInvoice }) => ({
  id: String(resource.id), status: resource.status, reason: resource.reason || "",
  amount: Number(resource.auto_recurring?.transaction_amount || 0), currency: resource.auto_recurring?.currency_id || "ARS",
  frequency: Number(resource.auto_recurring?.frequency || 1), frequencyType: resource.auto_recurring?.frequency_type || "months",
  nextPaymentDate: resource.next_payment_date || null, payerEmail: resource.payer_email || null,
  latestApprovedPayment: latestApprovedInvoice ? { id: String(latestApprovedInvoice.id), paidAt: latestApprovedInvoice.last_modified || latestApprovedInvoice.debit_date || latestApprovedInvoice.date_created, amount: Number(latestApprovedInvoice.transaction_amount || 0) } : null
});

export async function POST(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  try {
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    if (body.action === "search") {
      const businessId = Number(body.businessId || 0);
      const [[business]] = await db.query("SELECT id,name,email FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
      if (!business) return Response.json({ ok: false, error: "Seleccioná un cliente válido" }, { status: 404 });
      const payerEmail = String(body.payerEmail || business.email || "").trim().toLowerCase();
      if (!payerEmail || !payerEmail.includes("@")) return Response.json({ ok: false, error: "Ingresá un email válido para buscar la suscripción de Mercado Pago." }, { status: 400 });
      const results = await searchSubscriptionMercadoPagoPreapprovals(payerEmail);
      const subscriptions = results.map(resource => ({ id: String(resource.id || ""), status: resource.status || "", reason: resource.reason || "", amount: Number(resource.auto_recurring?.transaction_amount || 0), currency: resource.auto_recurring?.currency_id || "ARS", nextPaymentDate: resource.next_payment_date || null, payerEmail: resource.payer_email || payerEmail })).filter(item => item.id);
      return Response.json({ ok: true, business: { id: business.id, name: business.name }, payerEmail, subscriptions });
    }
    const inspected = await inspectExistingMercadoPagoSubscription(body.preapprovalId);
    const existingSubscriptionId = Number(body.existingSubscriptionId || 0);
    const [[duplicate]] = await db.query("SELECT s.id,b.name business_name FROM tags_subscriptions s INNER JOIN tags_businesses b ON b.id=s.business_id WHERE s.external_subscription_id=? AND s.id<>? LIMIT 1", [String(inspected.resource.id), existingSubscriptionId]);
    if (duplicate) return Response.json({ ok: false, error: `Esta suscripción de Mercado Pago ya está vinculada a ${duplicate.business_name} (suscripción ${duplicate.id}).` }, { status: 409 });
    if (body.action === "inspect") return Response.json({ ok: true, subscription: publicSummary(inspected) });
    if (!inspected.latestApprovedInvoice) return Response.json({ ok: false, error: "No se encontró ningún cobro aprobado para establecer la vigencia inicial." }, { status: 409 });
    if (existingSubscriptionId) {
      const amount = Number(body.monthlyAmount || inspected.resource.auto_recurring?.transaction_amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) return Response.json({ ok: false, error: "Ingresá un monto mensual válido" }, { status: 400 });
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [[current]] = await conn.query("SELECT s.id,s.business_id,t.terms_snapshot_json FROM tags_subscriptions s LEFT JOIN tags_subscription_terms t ON t.subscription_id=s.id WHERE s.id=? FOR UPDATE", [existingSubscriptionId]);
        if (!current || Number(current.business_id) !== Number(body.businessId)) throw Object.assign(new Error("La suscripción seleccionada no corresponde al cliente"), { status: 409 });
        let snapshot = {};
        try { snapshot = typeof current.terms_snapshot_json === "object" ? current.terms_snapshot_json : JSON.parse(current.terms_snapshot_json || "{}"); } catch { snapshot = {}; }
        snapshot.payment = { ...(snapshot.payment || {}), provider: "mercadopago", payerEmail: String(inspected.resource.payer_email || body.payerEmail || "").trim().toLowerCase() };
        if (current.terms_snapshot_json != null) await conn.query("UPDATE tags_subscription_terms SET billing_mode='recurring',terms_snapshot_json=?,updated_at=NOW() WHERE subscription_id=?", [JSON.stringify(snapshot), existingSubscriptionId]);
        else await conn.query("INSERT INTO tags_subscription_terms (subscription_id,plan_version_id,offer_id,price_code,billing_mode,terms_snapshot_json) VALUES (?,NULL,NULL,NULL,'recurring',?)", [existingSubscriptionId, JSON.stringify(snapshot)]);
        await conn.query("UPDATE tags_subscriptions SET payment_provider='mercadopago',external_subscription_id=?,provider_status=?,provider_init_point=?,provider_next_payment_at=?,provider_last_synced_at=NOW(),provider_payload=?,amount=?,currency=?,duration_months=?,auto_renew=1,updated_at=NOW() WHERE id=?", [String(inspected.resource.id), inspected.resource.status, inspected.resource.init_point || null, inspected.resource.next_payment_date ? new Date(inspected.resource.next_payment_date) : null, JSON.stringify(inspected.resource), amount, inspected.resource.auto_recurring?.currency_id || "ARS", Number(inspected.resource.auto_recurring?.frequency || 1), existingSubscriptionId]);
        await conn.query("INSERT INTO tags_subscription_audit_events (subscription_id,business_id,event_code,actor_type,actor_id,idempotency_key,next_state_json,context_json) VALUES (?,?,'subscription.mercadopago_existing_linked','admin',?,?,?,?)", [existingSubscriptionId, Number(body.businessId), Number(access.session?.businessId || access.session?.id || 0) || null, `mercadopago:existing-link:${inspected.resource.id}`, JSON.stringify({ provider: "mercadopago", providerStatus: inspected.resource.status }), JSON.stringify({ preapprovalId: String(inspected.resource.id), clientNotified: false })]);
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally { conn.release(); }
      await reconcileMercadoPagoSubscription(existingSubscriptionId, { includeLatestWhenEmpty: true });
      return Response.json({ ok: true, subscriptionId: existingSubscriptionId, clientNotified: false, mercadoPago: publicSummary(inspected) });
    }
    await resolveAdminSubscriptionSelection(body, Number(access.session?.businessId || access.session?.id || 0) || null);
    const frequency = Number(inspected.resource.auto_recurring?.frequency || 1);
    const providerAmount = Number(inspected.resource.auto_recurring?.transaction_amount || 0);
    const amount = Number(body.monthlyAmount || providerAmount);
    if (!Number.isFinite(amount) || amount <= 0) return Response.json({ ok: false, error: "Ingresá un monto mensual válido" }, { status: 400 });
    const origin = String(getRequestBaseUrl(req) || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/+$/, "");
    const created = await createAdminSubscription({ ...body, origin, notifyClient: false, paymentState: "pending", customAmount: amount, durationMonths: frequency, legacyMercadoPagoImport: true }, Number(access.session?.businessId || access.session?.id || 0) || null);
    if (created.paymentProvider !== "mercadopago") throw Object.assign(new Error("Seleccioná la modalidad mensual de Mercado Pago del plan"), { status: 400 });
    await db.query("UPDATE tags_subscriptions SET external_subscription_id=?,provider_status=?,provider_init_point=?,provider_next_payment_at=?,provider_last_synced_at=NOW(),provider_payload=?,amount=?,currency=?,duration_months=?,auto_renew=1,updated_at=NOW() WHERE id=?", [String(inspected.resource.id), inspected.resource.status, inspected.resource.init_point || null, inspected.resource.next_payment_date ? new Date(inspected.resource.next_payment_date) : null, JSON.stringify(inspected.resource), amount, inspected.resource.auto_recurring?.currency_id || "ARS", frequency, created.subscriptionId]);
    await reconcileMercadoPagoSubscription(created.subscriptionId, { includeLatestWhenEmpty: true });
    await db.query("INSERT INTO tags_subscription_audit_events (subscription_id,business_id,event_code,actor_type,actor_id,idempotency_key,next_state_json,context_json) VALUES (?,?,'subscription.mercadopago_legacy_imported','admin',?,?,?,?)", [created.subscriptionId, Number(body.businessId), Number(access.session?.businessId || access.session?.id || 0) || null, `mercadopago:legacy-import:${inspected.resource.id}`, JSON.stringify({ status: inspected.resource.status }), JSON.stringify({ preapprovalId: String(inspected.resource.id), clientNotified: false })]);
    return Response.json({ ok: true, subscriptionId: created.subscriptionId, clientNotified: false, mercadoPago: publicSummary(inspected) });
  } catch (error) {
    console.error("SUBSCRIPTION MERCADO PAGO LEGACY IMPORT ERROR", error);
    return Response.json({ ok: false, error: error?.message || "No se pudo importar la suscripción existente" }, { status: error?.status || 500 });
  }
}
