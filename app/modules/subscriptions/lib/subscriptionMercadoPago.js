import { MercadoPagoConfig, PreApproval, Invoice } from "mercadopago";
import { db } from "@/app/lib/tags-db";

const accessTokens = () => [...new Set([
  process.env.MERCADOPAGO_ACCESS_TOKEN,
  process.env.DIRECTORY_MERCADOPAGO_ACCESS_TOKEN
].map(value => String(value || "").trim()).filter(Boolean))];
const accessToken = () => accessTokens()[0] || "";

export function subscriptionMercadoPagoConfigured() {
  return Boolean(accessToken());
}

function client() {
  if (!accessToken()) {
    throw Object.assign(new Error("Mercado Pago no está configurado para suscripciones"), { status: 503 });
  }
  return new MercadoPagoConfig({ accessToken: accessToken(), options: { timeout: 15000 } });
}

async function readWithConfiguredClients(reader, { acceptEmpty = false } = {}) {
  let lastError = null;
  let lastResult = null;
  for (const token of accessTokens()) {
    try {
      const result = await reader(new MercadoPagoConfig({ accessToken: token, options: { timeout: 15000 } }));
      lastResult = result;
      if (acceptEmpty || result?.id || (Array.isArray(result?.results) && result.results.length)) return result;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastResult) return lastResult;
  if (lastError) throw lastError;
  throw Object.assign(new Error("Mercado Pago no está configurado para suscripciones"), { status: 503 });
}

export function subscriptionReference(subscriptionId, offerId) {
  return `tags-subscription:${Number(subscriptionId)}:offer:${Number(offerId)}`;
}

export function parseSubscriptionReference(value) {
  const match = String(value || "").match(/^tags-subscription:(\d+):offer:(\d+)$/);
  return match ? { subscriptionId: Number(match[1]), offerId: Number(match[2]) } : null;
}

export async function getSubscriptionMercadoPagoPreapproval(id) {
  return readWithConfiguredClients(config => new PreApproval(config).get({ id: String(id) }));
}

export async function getSubscriptionMercadoPagoInvoice(id) {
  return readWithConfiguredClients(config => new Invoice(config).get({ id: String(id) }));
}

export async function searchSubscriptionMercadoPagoInvoices(preapprovalId) {
  const response = await readWithConfiguredClients(config => new Invoice(config).search({
    options: { preapproval_id: String(preapprovalId) }
  }));
  return Array.isArray(response?.results) ? response.results : [];
}

export async function searchSubscriptionMercadoPagoPreapprovals(payerEmail) {
  const email = String(payerEmail || "").trim().toLowerCase();
  if (!email) throw Object.assign(new Error("Ingresá un email para buscar suscripciones"), { status: 400 });
  const tokens = accessTokens();
  if (!tokens.length) throw Object.assign(new Error("Mercado Pago no está configurado para suscripciones"), { status: 503 });
  const found = new Map();
  const responses = await Promise.allSettled(tokens.map(token => new PreApproval(new MercadoPagoConfig({ accessToken: token, options: { timeout: 15000 } })).search({ options: { payer_email: email } })));
  const successful = responses.filter(result => result.status === "fulfilled");
  if (!successful.length) throw responses.find(result => result.status === "rejected")?.reason || new Error("Mercado Pago no respondió la consulta");
  for (const result of successful) for (const item of result.value?.results || []) if (item?.id) found.set(String(item.id), item);
  return [...found.values()];
}

export async function ensureMercadoPagoSubscription(subscriptionId, baseUrl) {
  const [[row]] = await db.query(
    `SELECT s.id,s.business_id,s.plan_id,s.amount,s.currency,s.external_subscription_id,s.provider_init_point,b.email,b.name business_name,p.name plan_name,t.offer_id,t.terms_snapshot_json FROM tags_subscriptions s INNER JOIN tags_businesses b ON b.id=s.business_id INNER JOIN tags_plans p ON p.id=s.plan_id INNER JOIN tags_subscription_terms t ON t.subscription_id=s.id WHERE s.id=? AND s.payment_provider='mercadopago' LIMIT 1`,
    [subscriptionId]
  );
  if (!row) throw Object.assign(new Error("Suscripción automática inexistente"), { status: 404 });
  if (row.external_subscription_id && row.provider_init_point) {
    return { id: row.external_subscription_id, init_point: row.provider_init_point, reused: true };
  }
  const root = String(baseUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (!root) throw Object.assign(new Error("Falta la URL pública de Tags"), { status: 503 });
  let terms = {};
  try { terms = typeof row.terms_snapshot_json === "object" ? row.terms_snapshot_json : JSON.parse(row.terms_snapshot_json || "{}"); } catch { terms = {}; }
  const payerEmail = String(terms?.payment?.payerEmail || row.email || "").trim().toLowerCase();
  if (!payerEmail || !payerEmail.includes("@")) throw Object.assign(new Error("La suscripción no tiene un email pagador válido"), { status: 409 });
  const response = await new PreApproval(client()).create({
    body: {
      reason: `${row.plan_name} · ${row.business_name}`.slice(0, 120),
      external_reference: subscriptionReference(row.id, row.offer_id),
      payer_email: payerEmail,
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
