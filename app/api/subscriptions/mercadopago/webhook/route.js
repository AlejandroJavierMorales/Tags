import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/app/lib/tags-db";
import {
  getSubscriptionMercadoPagoInvoice,
  getSubscriptionMercadoPagoPreapproval,
  parseSubscriptionReference
} from "@/app/modules/subscriptions/lib/subscriptionMercadoPago";
import {
  activateSubscription,
  markSubscriptionPaymentFailure
} from "@/app/modules/subscriptions/lib/subscriptionActivationService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSignature(req, resourceId) {
  const secret = String(
    process.env.SUBSCRIPTIONS_MERCADOPAGO_WEBHOOK_SECRET
    || process.env.DIRECTORY_MERCADOPAGO_WEBHOOK_SECRET
    || ""
  ).trim();
  if (!secret) return false;
  const requestId = req.headers.get("x-request-id") || "";
  const parts = Object.fromEntries(
    String(req.headers.get("x-signature") || "")
      .split(",")
      .map(value => value.trim().split("="))
      .filter(value => value.length === 2)
  );
  if (!parts.ts || !parts.v1) return false;
  const expected = createHmac("sha256", secret)
    .update(`id:${String(resourceId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`)
    .digest("hex");
  const received = Buffer.from(parts.v1, "hex");
  const valid = Buffer.from(expected, "hex");
  return received.length === valid.length && timingSafeEqual(received, valid);
}

async function syncPreapproval(resource) {
  const reference = parseSubscriptionReference(resource.external_reference);
  const lookupValue = reference?.subscriptionId || String(resource.id);
  const [result] = await db.query(
    `UPDATE tags_subscriptions SET external_subscription_id=?,provider_status=?,provider_init_point=COALESCE(?,provider_init_point),provider_next_payment_at=?,provider_last_synced_at=NOW(),provider_payload=?,auto_renew=?,updated_at=NOW() WHERE ${reference ? "id=?" : "external_subscription_id=?"}`,
    [String(resource.id), resource.status || null, resource.init_point || null, resource.next_payment_date ? new Date(resource.next_payment_date) : null, JSON.stringify(resource), ["authorized", "pending"].includes(resource.status) ? 1 : 0, lookupValue]
  );
  return { subscriptionId: reference?.subscriptionId || null, affected: result.affectedRows };
}

async function findInvoiceSubscription(invoice) {
  const reference = parseSubscriptionReference(invoice.external_reference);
  const [[subscription]] = await db.query(
    `SELECT s.id FROM tags_subscriptions s INNER JOIN tags_subscription_terms t ON t.subscription_id=s.id WHERE ${reference ? "s.id=?" : "s.external_subscription_id=?"} LIMIT 1`,
    [reference?.subscriptionId || String(invoice.preapproval_id || "")]
  );
  return subscription?.id ? Number(subscription.id) : 0;
}

async function syncInvoice(invoice, eventKey) {
  const subscriptionId = await findInvoiceSubscription(invoice);
  if (!subscriptionId) return { ignored: true };
  const providerStatus = invoice.payment?.status || invoice.status || "pending";
  if (providerStatus === "approved") {
    return activateSubscription({
      subscriptionId,
      paidAt: new Date(invoice.last_modified || invoice.debit_date || invoice.date_created || Date.now()),
      amount: Number(invoice.transaction_amount || 0),
      currency: invoice.currency_id || "ARS",
      provider: "mercadopago",
      providerInvoiceId: String(invoice.id),
      providerPaymentId: invoice.payment?.id ? String(invoice.payment.id) : null,
      providerStatus,
      rawResponse: invoice,
      notes: `Cuota automática Mercado Pago · ${invoice.id}`,
      actorType: "provider",
      idempotencyKey: `mercadopago:${eventKey}:activated`
    });
  }
  if (["rejected", "cancelled"].includes(providerStatus)) {
    await markSubscriptionPaymentFailure({
      subscriptionId,
      providerStatus,
      rawResponse: invoice,
      idempotencyKey: `mercadopago:${eventKey}:failed`
    });
  }
  return { subscriptionId, paymentStatus: providerStatus };
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const url = new URL(req.url);
  const resourceId = body?.data?.id || body?.id || url.searchParams.get("data.id");
  const eventType = String(body?.type || body?.topic || body?.action || "");
  if (!resourceId) return Response.json({ ok: true, ignored: true });
  if (!validSignature(req, resourceId)) {
    return Response.json({ ok: false, error: "Webhook no autorizado" }, { status: 401 });
  }
  const requestId = req.headers.get("x-request-id") || "";
  const eventKey = requestId || createHash("sha256")
    .update(`${eventType}:${resourceId}:${JSON.stringify(body)}`)
    .digest("hex");
  const [insert] = await db.query(
    `INSERT IGNORE INTO tags_subscription_provider_events (provider,event_key,event_type,resource_id,processing_status,request_id,payload_json,created_at,updated_at) VALUES ('mercadopago',?,?,?,'received',?,?,NOW(),NOW())`,
    [eventKey, eventType, String(resourceId), requestId || null, JSON.stringify(body)]
  );
  if (!insert.affectedRows) return Response.json({ ok: true, duplicate: true });
  try {
    let result;
    if (eventType.includes("authorized_payment")) {
      result = await syncInvoice(await getSubscriptionMercadoPagoInvoice(resourceId), eventKey);
    } else if (eventType.includes("preapproval") && !eventType.includes("plan")) {
      result = await syncPreapproval(await getSubscriptionMercadoPagoPreapproval(resourceId));
    } else {
      result = { ignored: true };
    }
    await db.query(
      "UPDATE tags_subscription_provider_events SET subscription_id=?,processing_status=?,processed_at=NOW(),updated_at=NOW() WHERE provider='mercadopago' AND event_key=?",
      [result?.subscriptionId || null, result?.ignored ? "ignored" : "processed", eventKey]
    );
    return Response.json({ ok: true, ...result });
  } catch (error) {
    await db.query(
      "UPDATE tags_subscription_provider_events SET processing_status='failed',error_message=?,processed_at=NOW(),updated_at=NOW() WHERE provider='mercadopago' AND event_key=?",
      [String(error?.message || error).slice(0, 2000), eventKey]
    );
    console.error("SUBSCRIPTIONS MERCADO PAGO WEBHOOK ERROR", error);
    return Response.json({ ok: false, error: "No se pudo procesar la notificación" }, { status: 500 });
  }
}
