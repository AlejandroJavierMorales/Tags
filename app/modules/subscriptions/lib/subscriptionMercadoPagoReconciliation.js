import { db } from "@/app/lib/tags-db";
import { activateSubscription, markSubscriptionPaymentFailure } from "@/app/modules/subscriptions/lib/subscriptionActivationService";
import { getSubscriptionMercadoPagoPreapproval, searchSubscriptionMercadoPagoInvoices } from "@/app/modules/subscriptions/lib/subscriptionMercadoPago";

const invoiceDate = invoice => new Date(invoice?.debit_date || invoice?.date_created || invoice?.last_modified || 0);
const paymentStatus = invoice => String(invoice?.payment?.status || invoice?.status || "pending");
const addMonths = (value, months) => {
  const date = new Date(value);
  date.setMonth(date.getMonth() + Math.max(1, Number(months || 1)));
  return date;
};

export async function inspectExistingMercadoPagoSubscription(preapprovalId) {
  const id = String(preapprovalId || "").trim();
  if (!id) throw Object.assign(new Error("Ingresá el Preapproval ID de Mercado Pago"), { status: 400 });
  const resource = await getSubscriptionMercadoPagoPreapproval(id);
  if (!resource?.id || String(resource.id) !== id) throw Object.assign(new Error("Mercado Pago no devolvió la suscripción solicitada"), { status: 404 });
  const recurring = resource.auto_recurring || {};
  const status = String(resource.status || "");
  if (!["authorized", "paused", "pending"].includes(status)) throw Object.assign(new Error(`La suscripción de Mercado Pago no se puede vincular. Estado actual: ${resource.status || "desconocido"}`), { status: 409 });
  if (String(recurring.frequency_type || "") !== "months" || Number(recurring.frequency || 0) < 1) throw Object.assign(new Error("La suscripción existente no posee una periodicidad mensual compatible"), { status: 409 });
  if (!Number.isFinite(Number(recurring.transaction_amount)) || Number(recurring.transaction_amount) <= 0) throw Object.assign(new Error("Mercado Pago no informó un importe válido"), { status: 409 });
  const invoices = await searchSubscriptionMercadoPagoInvoices(id);
  const approvedInvoices = invoices.filter(invoice => paymentStatus(invoice) === "approved" && invoice?.id).sort((a, b) => invoiceDate(a) - invoiceDate(b));
  const latestApprovedInvoice = approvedInvoices.at(-1) || null;
  return { resource, latestApprovedInvoice, approvedInvoices };
}

export async function reconcileMercadoPagoSubscription(subscriptionId, { includeLatestWhenEmpty = true } = {}) {
  const [[subscription]] = await db.query("SELECT id,external_subscription_id FROM tags_subscriptions WHERE id=? AND payment_provider='mercadopago' LIMIT 1", [Number(subscriptionId)]);
  if (!subscription?.external_subscription_id) throw Object.assign(new Error("La suscripción no tiene un Preapproval ID vinculado"), { status: 409 });
  const resource = await getSubscriptionMercadoPagoPreapproval(subscription.external_subscription_id);
  await db.query("UPDATE tags_subscriptions SET provider_status=?,provider_init_point=COALESCE(?,provider_init_point),provider_next_payment_at=?,provider_last_synced_at=NOW(),provider_payload=?,auto_renew=?,updated_at=NOW() WHERE id=?", [resource.status || null, resource.init_point || null, resource.next_payment_date ? new Date(resource.next_payment_date) : null, JSON.stringify(resource), ["authorized", "pending"].includes(resource.status) ? 1 : 0, subscription.id]);
  const invoices = await searchSubscriptionMercadoPagoInvoices(subscription.external_subscription_id);
  const approved = invoices.filter(invoice => paymentStatus(invoice) === "approved" && invoice?.id).sort((a, b) => invoiceDate(a) - invoiceDate(b));
  const [[lastPayment]] = await db.query("SELECT paid_at FROM tags_subscription_payments WHERE subscription_id=? AND provider='mercadopago' AND status='approved' ORDER BY paid_at DESC,id DESC LIMIT 1", [subscription.id]);
  const cutoff = lastPayment?.paid_at ? new Date(lastPayment.paid_at) : null;
  let pending = cutoff ? approved.filter(invoice => invoiceDate(invoice) >= cutoff) : (includeLatestWhenEmpty ? approved.slice(-1) : []);
  const [recorded] = pending.length ? await db.query(`
    SELECT pay.provider_invoice_id,pay.notes,
           EXISTS(
             SELECT 1 FROM tags_subscription_audit_events event
              WHERE event.idempotency_key=CONCAT('mercadopago:duplicate:',pay.provider_invoice_id)
           ) duplicate_audited
      FROM tags_subscription_payments pay
     WHERE pay.provider='mercadopago'
       AND pay.provider_invoice_id IN (${pending.map(() => "?").join(",")})
  `, pending.map(invoice => String(invoice.id))) : [[]];
  const recordedByInvoice = new Map(recorded.map(item => [String(item.provider_invoice_id), item]));
  pending = pending.filter(invoice => {
    const payment = recordedByInvoice.get(String(invoice.id));
    if (!payment) return true;
    return String(payment.notes || "").startsWith("Cobro automático duplicado") && Number(payment.duplicate_audited || 0) === 0;
  });
  const processed = [];
  for (const invoice of pending) {
    const invoicePaidAt = invoiceDate(invoice);
    const providerNextPaymentAt = resource.next_payment_date ? new Date(resource.next_payment_date) : null;
    const automaticPeriodEnd = providerNextPaymentAt && providerNextPaymentAt > invoicePaidAt
      ? providerNextPaymentAt
      : addMonths(invoicePaidAt, resource.auto_recurring?.frequency || 1);
    const [[manualCoverage]] = await db.query(
      `SELECT id,period_start,period_end FROM tags_subscription_payments
       WHERE subscription_id=? AND status='approved' AND provider<>'mercadopago'
         AND period_start IS NOT NULL AND period_end IS NOT NULL AND ?>=period_start AND ?<=period_end
       ORDER BY paid_at DESC,id DESC LIMIT 1`,
      [subscription.id, invoicePaidAt, automaticPeriodEnd]
    );
    if (manualCoverage) {
      const [duplicatePayment] = await db.query(
        `INSERT INTO tags_subscription_payments (subscription_id,business_id,plan_id,amount,currency,provider,provider_invoice_id,provider_payment_id,provider_status,raw_response_json,status,paid_at,period_start,period_end,notes,created_at,updated_at)
         SELECT s.id,s.business_id,s.plan_id,?,?,'mercadopago',?,?,'approved',?,'approved',?,?,?,?,NOW(),NOW()
         FROM tags_subscriptions s WHERE s.id=?
         ON DUPLICATE KEY UPDATE provider_status=VALUES(provider_status),raw_response_json=VALUES(raw_response_json),updated_at=NOW()`,
        [Number(invoice.transaction_amount || 0), invoice.currency_id || resource.auto_recurring?.currency_id || "ARS", String(invoice.id), invoice.payment?.id ? String(invoice.payment.id) : null, JSON.stringify(invoice), invoicePaidAt, manualCoverage.period_start, manualCoverage.period_end, `Cobro automático duplicado del período cubierto manualmente · ${invoice.id}`, subscription.id]
      );
      const paymentId = Number(duplicatePayment.insertId || 0);
      await db.query(
        `INSERT INTO tags_subscription_audit_events (subscription_id,business_id,event_code,actor_type,idempotency_key,next_state_json,context_json)
         SELECT id,business_id,'payment.duplicate_detected','provider',?,?,? FROM tags_subscriptions WHERE id=?
         ON DUPLICATE KEY UPDATE idempotency_key=VALUES(idempotency_key)`,
        [`mercadopago:duplicate:${invoice.id}`, JSON.stringify({ paymentId, manualPaymentId: Number(manualCoverage.id) }), JSON.stringify({ providerInvoiceId: String(invoice.id), periodStart: manualCoverage.period_start, periodEnd: manualCoverage.period_end }), subscription.id]
      );
      processed.push(paymentId);
      continue;
    }
    const result = await activateSubscription({ subscriptionId: subscription.id, paidAt: invoiceDate(invoice), amount: Number(invoice.transaction_amount || 0), currency: invoice.currency_id || resource.auto_recurring?.currency_id || "ARS", provider: "mercadopago", providerInvoiceId: String(invoice.id), providerPaymentId: invoice.payment?.id ? String(invoice.payment.id) : null, providerStatus: "approved", rawResponse: invoice, notes: `Cuota automática Mercado Pago · ${invoice.id}`, actorType: "provider", idempotencyKey: `mercadopago:reconcile:${invoice.id}` });
    processed.push(result.paymentId);
  }
  if (["paused", "cancelled"].includes(String(resource.status || "")) && !processed.length) await markSubscriptionPaymentFailure({ subscriptionId: subscription.id, providerStatus: resource.status, rawResponse: resource, idempotencyKey: `mercadopago:preapproval:${resource.id}:${resource.status}` });
  await db.query("UPDATE tags_subscriptions SET provider_status=?,provider_next_payment_at=?,provider_last_synced_at=NOW(),provider_payload=?,auto_renew=?,updated_at=NOW() WHERE id=?", [resource.status || null, resource.next_payment_date ? new Date(resource.next_payment_date) : null, JSON.stringify(resource), ["authorized", "pending"].includes(resource.status) ? 1 : 0, subscription.id]);
  return { subscriptionId: Number(subscription.id), status: resource.status, paymentsProcessed: processed.length };
}
