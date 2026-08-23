import { db } from "@/app/lib/tags-db";

const addMonths = (value, months) => {
  const result = new Date(value);
  result.setMonth(result.getMonth() + Math.max(1, Number(months || 1)));
  return result;
};

export async function activateSubscription({
  subscriptionId,
  paidAt = new Date(),
  amount = null,
  currency = null,
  provider = "manual",
  providerInvoiceId = null,
  providerPaymentId = null,
  providerStatus = "approved",
  rawResponse = null,
  notes = "Pago acreditado",
  actorType = "system",
  actorId = null,
  idempotencyKey = null,
  connection = null
}) {
  const conn = connection || await db.getConnection();
  const ownsTransaction = !connection;
  try {
    if (ownsTransaction) await conn.beginTransaction();
    const [[subscription]] = await conn.query(
      "SELECT * FROM tags_subscriptions WHERE id=? LIMIT 1 FOR UPDATE",
      [Number(subscriptionId)]
    );
    if (!subscription) throw Object.assign(new Error("Suscripción inexistente"), { status: 404 });

    const now = new Date(paidAt || Date.now());
    const currentExpiry = subscription.expires_at ? new Date(subscription.expires_at) : null;
    const periodStart = subscription.status === "active" && currentExpiry && currentExpiry > now
      ? currentExpiry
      : now;
    const requestedExpiry = subscription.admin_override_until ? new Date(subscription.admin_override_until) : null;
    const periodEnd = requestedExpiry && !Number.isNaN(requestedExpiry.getTime())
      ? requestedExpiry
      : addMonths(periodStart, subscription.duration_months);

    let paymentId = null;
    if (providerInvoiceId) {
      const [[existing]] = await conn.query(
        "SELECT id FROM tags_subscription_payments WHERE provider=? AND provider_invoice_id=? LIMIT 1 FOR UPDATE",
        [provider, String(providerInvoiceId)]
      );
      paymentId = existing?.id || null;
    } else {
      const [[pending]] = await conn.query(
        "SELECT id FROM tags_subscription_payments WHERE subscription_id=? AND status='pending' ORDER BY id DESC LIMIT 1 FOR UPDATE",
        [subscription.id]
      );
      paymentId = pending?.id || null;
    }

    if (paymentId) {
      await conn.query(
        `UPDATE tags_subscription_payments SET amount=?,currency=?,provider=?,provider_invoice_id=COALESCE(?,provider_invoice_id),provider_payment_id=COALESCE(?,provider_payment_id),provider_status=?,raw_response_json=?,status='approved',paid_at=?,period_start=?,period_end=?,notes=?,updated_at=NOW() WHERE id=?`,
        [amount ?? subscription.amount, currency || subscription.currency || "ARS", provider, providerInvoiceId ? String(providerInvoiceId) : null, providerPaymentId ? String(providerPaymentId) : null, providerStatus, rawResponse ? JSON.stringify(rawResponse) : null, now, periodStart, periodEnd, notes, paymentId]
      );
    } else {
      const [payment] = await conn.query(
        `INSERT INTO tags_subscription_payments (subscription_id,business_id,plan_id,amount,currency,provider,provider_invoice_id,provider_payment_id,provider_status,raw_response_json,status,paid_at,period_start,period_end,notes,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,'approved',?,?,?,?,?,NOW(),NOW())`,
        [subscription.id, subscription.business_id, subscription.plan_id, amount ?? subscription.amount, currency || subscription.currency || "ARS", provider, providerInvoiceId ? String(providerInvoiceId) : null, providerPaymentId ? String(providerPaymentId) : null, providerStatus, rawResponse ? JSON.stringify(rawResponse) : null, now, periodStart, periodEnd, notes, actorId]
      );
      paymentId = Number(payment.insertId);
    }

    await conn.query(
      `UPDATE tags_subscriptions SET status='active',payment_provider=?,provider_status=?,started_at=COALESCE(started_at,?),expires_at=?,next_billing_at=?,admin_override_until=NULL,provider_next_payment_at=IF(?='mercadopago',?,provider_next_payment_at),provider_last_synced_at=IF(?='mercadopago',NOW(),provider_last_synced_at),auto_renew=IF(?='mercadopago',1,auto_renew),updated_at=NOW() WHERE id=?`,
      [provider, providerStatus, periodStart, periodEnd, periodEnd, provider, periodEnd, provider, provider, subscription.id]
    );
    await conn.query(
      "UPDATE tags_businesses SET plan_id=?,subscription_status='active',plan_started_at=COALESCE(plan_started_at,?),plan_expires_at=?,updated_at=NOW() WHERE id=?",
      [subscription.plan_id, periodStart, periodEnd, subscription.business_id]
    );
    await conn.query(
      `UPDATE tags_business_addons ba INNER JOIN tags_subscription_addon_grants g ON g.business_addon_id=ba.id SET ba.status='active',ba.started_at=COALESCE(ba.started_at,?),ba.expires_at=?,ba.updated_at=NOW(),g.status='active',g.starts_at=COALESCE(g.starts_at,?),g.expires_at=?,g.updated_at=NOW() WHERE g.subscription_id=?`,
      [periodStart, periodEnd, periodStart, periodEnd, subscription.id]
    );
    await conn.query(
      `INSERT INTO tags_subscription_audit_events (subscription_id,business_id,event_code,actor_type,actor_id,idempotency_key,next_state_json,context_json) VALUES (?,?,'subscription.activated',?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id`,
      [subscription.id, subscription.business_id, actorType, actorId, idempotencyKey, JSON.stringify({ status: "active", expiresAt: periodEnd }), JSON.stringify({ paymentId, provider })]
    );
    if (ownsTransaction) await conn.commit();
    return { subscriptionId: Number(subscription.id), businessId: Number(subscription.business_id), paymentId, periodStart, periodEnd };
  } catch (error) {
    if (ownsTransaction) await conn.rollback();
    throw error;
  } finally {
    if (ownsTransaction) conn.release();
  }
}

export async function markSubscriptionPaymentFailure({ subscriptionId, providerStatus, rawResponse, idempotencyKey = null }) {
  await db.query(
    `UPDATE tags_subscriptions SET status=IF(expires_at IS NULL OR expires_at<=NOW(),'past_due',status),provider_status=?,provider_last_synced_at=NOW(),provider_payload=?,updated_at=NOW() WHERE id=?`,
    [providerStatus, rawResponse ? JSON.stringify(rawResponse) : null, Number(subscriptionId)]
  );
  await db.query(
    `INSERT INTO tags_subscription_audit_events (subscription_id,business_id,event_code,actor_type,idempotency_key,next_state_json,context_json) SELECT id,business_id,'payment.failed','provider',?,?,? FROM tags_subscriptions WHERE id=? ON DUPLICATE KEY UPDATE id=id`,
    [idempotencyKey, JSON.stringify({ providerStatus }), JSON.stringify(rawResponse || {}), Number(subscriptionId)]
  );
}
