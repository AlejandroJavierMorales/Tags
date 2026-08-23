import { MercadoPagoConfig, PreApproval, Invoice } from "mercadopago";
import { db } from "@/app/lib/tags-db";

const accessToken = () => String(
  process.env.MERCADOPAGO_ACCESS_TOKEN
  || process.env.DIRECTORY_MERCADOPAGO_ACCESS_TOKEN
  || ""
).trim();

export function subscriptionMercadoPagoConfigured() {
  return Boolean(accessToken());
}

function client() {
  if (!accessToken()) {
    throw Object.assign(new Error("Mercado Pago no está configurado para suscripciones"), { status: 503 });
  }
  return new MercadoPagoConfig({ accessToken: accessToken(), options: { timeout: 15000 } });
}

export function subscriptionReference(subscriptionId, offerId) {
  return `tags-subscription:${Number(subscriptionId)}:offer:${Number(offerId)}`;
}

export function parseSubscriptionReference(value) {
  const match = String(value || "").match(/^tags-subscription:(\d+):offer:(\d+)$/);
  return match ? { subscriptionId: Number(match[1]), offerId: Number(match[2]) } : null;
}

export async function getSubscriptionMercadoPagoPreapproval(id) {
  return new PreApproval(client()).get({ id: String(id) });
}

export async function getSubscriptionMercadoPagoInvoice(id) {
  return new Invoice(client()).get({ id: String(id) });
}

export async function ensureMercadoPagoSubscription(subscriptionId, baseUrl) {
  const [[row]] = await db.query(
    `SELECT s.id,s.business_id,s.plan_id,s.amount,s.currency,s.external_subscription_id,s.provider_init_point,b.email,b.name business_name,p.name plan_name,t.offer_id FROM tags_subscriptions s INNER JOIN tags_businesses b ON b.id=s.business_id INNER JOIN tags_plans p ON p.id=s.plan_id INNER JOIN tags_subscription_terms t ON t.subscription_id=s.id WHERE s.id=? AND s.payment_provider='mercadopago' LIMIT 1`,
    [subscriptionId]
  );
  if (!row) throw Object.assign(new Error("Suscripción automática inexistente"), { status: 404 });
  if (row.external_subscription_id && row.provider_init_point) {
    return { id: row.external_subscription_id, init_point: row.provider_init_point, reused: true };
  }
  const root = String(baseUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (!root) throw Object.assign(new Error("Falta la URL pública de Tags"), { status: 503 });
  const response = await new PreApproval(client()).create({
    body: {
      reason: `${row.plan_name} · ${row.business_name}`.slice(0, 120),
      external_reference: subscriptionReference(row.id, row.offer_id),
      payer_email: row.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number(row.amount),
        currency_id: row.currency || "ARS"
      },
      back_url: `${root}/suscripcion/mercadopago/resultado?subscription=${row.id}`,
      status: "pending"
    },
    requestOptions: { idempotencyKey: `tags-subscription-${row.id}` }
  });
  if (!response?.id || !response?.init_point) {
    throw new Error("Mercado Pago no devolvió el enlace de autorización");
  }
  await db.query(
    `UPDATE tags_subscriptions SET external_subscription_id=?,provider_status=?,provider_init_point=?,provider_next_payment_at=?,provider_last_synced_at=NOW(),provider_payload=?,auto_renew=1,updated_at=NOW() WHERE id=?`,
    [String(response.id), response.status || "pending", response.init_point, response.next_payment_date ? new Date(response.next_payment_date) : null, JSON.stringify(response), row.id]
  );
  return response;
}
