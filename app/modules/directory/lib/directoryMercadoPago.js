import { MercadoPagoConfig, PreApproval, Invoice } from "mercadopago";
import { db } from "@/app/lib/tags-db";
import { getRequestBaseUrl } from "@/app/lib/channelContext";

const cleanBaseUrl = value => String(value || "").replace(/\/+$/, "");

export function directoryMercadoPagoConfigured() {
  return Boolean(String(process.env.DIRECTORY_MERCADOPAGO_ACCESS_TOKEN || "").trim());
}

export function directoryMercadoPagoClient() {
  const accessToken = String(process.env.DIRECTORY_MERCADOPAGO_ACCESS_TOKEN || "").trim();
  if (!accessToken) throw Object.assign(new Error("Mercado Pago no está configurado para suscripciones de Directorio"), { status: 503 });
  return new MercadoPagoConfig({ accessToken, options: { timeout: 15000 } });
}

export function directorySubscriptionReference(subscriptionId) {
  return `directory-subscription:${Number(subscriptionId)}`;
}

export function subscriptionIdFromReference(value) {
  const match = String(value || "").match(/^directory-subscription:(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export async function ensureDirectoryMercadoPagoSubscription({ subscriptionId, baseUrl }) {
  const [[row]] = await db.query(`
    SELECT s.id,s.business_id,s.plan_id,s.amount,s.currency,s.external_subscription_id,s.provider_init_point,
           b.email,b.name business_name,p.name plan_name,ds.name site_name
      FROM tags_subscriptions s
      INNER JOIN tags_businesses b ON b.id=s.business_id
      INNER JOIN tags_plans p ON p.id=s.plan_id
      LEFT JOIN tags_directory_listings l ON l.business_id=s.business_id
      LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
      LEFT JOIN tags_directory_sites ds ON ds.id=sl.site_id
     WHERE s.id=? AND s.payment_provider='mercadopago'
       AND p.code IN ('directory_web','directory_web_plus')
     ORDER BY ds.id LIMIT 1
  `, [subscriptionId]);
  if (!row) throw Object.assign(new Error("Suscripción automática no encontrada"), { status: 404 });
  if (row.external_subscription_id && row.provider_init_point) return { id: row.external_subscription_id, init_point: row.provider_init_point, reused: true };

  const root = cleanBaseUrl(baseUrl || process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL_PROD || process.env.NEXT_PUBLIC_APP_URL);
  if (!root) throw Object.assign(new Error("No está configurada la URL pública de la plataforma"), { status: 503 });
  const preapproval = new PreApproval(directoryMercadoPagoClient());
  const response = await preapproval.create({
    body: {
      reason: `${row.plan_name} · ${row.site_name || "Directorio"}`.slice(0, 120),
      external_reference: directorySubscriptionReference(row.id),
      payer_email: row.email,
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: Number(row.amount), currency_id: row.currency || "ARS" },
      back_url: `${root}/suscripcion/mercadopago/resultado?subscription=${row.id}`,
      status: "pending"
    },
    requestOptions: { idempotencyKey: `tags-directory-subscription-${row.id}` }
  });
  if (!response?.id || !response?.init_point) throw new Error("Mercado Pago no devolvió el enlace de autorización");
  await db.query(`UPDATE tags_subscriptions SET external_subscription_id=?,provider_status=?,provider_init_point=?,provider_next_payment_at=?,provider_last_synced_at=NOW(),provider_payload=?,auto_renew=1,updated_at=NOW() WHERE id=?`, [String(response.id), response.status || "pending", response.init_point, response.next_payment_date ? new Date(response.next_payment_date) : null, JSON.stringify(response), row.id]);
  return response;
}

export async function getDirectoryMercadoPagoPreapproval(id) {
  return new PreApproval(directoryMercadoPagoClient()).get({ id: String(id) });
}

export async function updateDirectoryMercadoPagoPreapproval(id, status) {
  return new PreApproval(directoryMercadoPagoClient()).update({ id: String(id), body: { status } });
}

export async function getDirectoryMercadoPagoInvoice(id) {
  return new Invoice(directoryMercadoPagoClient()).get({ id: String(id) });
}

export function directoryMercadoPagoBaseUrl(req) {
  return cleanBaseUrl(
    getRequestBaseUrl(req)
      || process.env.NEXT_PUBLIC_BASE_URL
      || process.env.BASE_URL_PROD
      || process.env.NEXT_PUBLIC_APP_URL
      || new URL(req.url).origin
  );
}
