import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/app/lib/tags-db";
import { getDirectoryMercadoPagoInvoice, getDirectoryMercadoPagoPreapproval, subscriptionIdFromReference } from "@/app/modules/directory/lib/directoryMercadoPago";
import { sendMail } from "@/app/lib/sendMail";
import { directoryEmailBranding, directoryEmailContact, directoryEmailHeader } from "@/app/modules/directory/lib/directoryEmailBranding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSignature(req, resourceId) {
  const secret = String(process.env.DIRECTORY_MERCADOPAGO_WEBHOOK_SECRET || "").trim();
  if (!secret) return false;
  const requestId = req.headers.get("x-request-id") || "";
  const parts = Object.fromEntries(String(req.headers.get("x-signature") || "").split(",").map(value => value.trim().split("=")).filter(value => value.length === 2));
  if (!parts.ts || !parts.v1) return false;
  const expected = createHmac("sha256", secret).update(`id:${String(resourceId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`).digest("hex");
  const received = Buffer.from(parts.v1, "hex");
  const valid = Buffer.from(expected, "hex");
  return received.length === valid.length && timingSafeEqual(received, valid);
}

function addMonth(value) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + 1);
  return date;
}

async function syncPreapproval(resource) {
  const subscriptionId = subscriptionIdFromReference(resource.external_reference);
  const [result] = await db.query(`UPDATE tags_subscriptions SET external_subscription_id=?,provider_status=?,provider_init_point=COALESCE(?,provider_init_point),provider_next_payment_at=?,provider_last_synced_at=NOW(),provider_payload=?,auto_renew=?,updated_at=NOW() WHERE ${subscriptionId ? "id=?" : "external_subscription_id=?"}`, [String(resource.id), resource.status || null, resource.init_point || null, resource.next_payment_date ? new Date(resource.next_payment_date) : null, JSON.stringify(resource), ["authorized", "pending"].includes(resource.status) ? 1 : 0, subscriptionId || String(resource.id)]);
  return { subscriptionId, affected: result.affectedRows };
}

async function syncInvoice(invoice) {
  const subscriptionIdFromExternal = subscriptionIdFromReference(invoice.external_reference);
  const [[subscription]] = await db.query(`SELECT s.* FROM tags_subscriptions s INNER JOIN tags_plans p ON p.id=s.plan_id WHERE ${subscriptionIdFromExternal ? "s.id=?" : "s.external_subscription_id=?"} AND p.code IN ('directory_web','directory_web_plus') LIMIT 1`, [subscriptionIdFromExternal || String(invoice.preapproval_id || "")]);
  if (!subscription) return { ignored: true };
  const paymentStatus = invoice.payment?.status || invoice.status || "pending";
  const localPaymentStatus = paymentStatus === "approved" ? "approved" : ["rejected", "cancelled"].includes(paymentStatus) ? "rejected" : "pending";
  const paidAt = paymentStatus === "approved" ? new Date(invoice.last_modified || invoice.debit_date || invoice.date_created || Date.now()) : null;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[current]] = await conn.query("SELECT * FROM tags_subscriptions WHERE id=? LIMIT 1 FOR UPDATE", [subscription.id]);
    let periodStart = null;
    let periodEnd = null;
    if (localPaymentStatus === "approved") {
      const now = paidAt || new Date();
      const currentExpiry = current.expires_at ? new Date(current.expires_at) : null;
      periodStart = current.status === "active" && currentExpiry && currentExpiry > now ? currentExpiry : now;
      periodEnd = addMonth(periodStart);
    }
    await conn.query(`INSERT INTO tags_subscription_payments (subscription_id,business_id,plan_id,amount,currency,provider,provider_invoice_id,provider_payment_id,provider_status,raw_response_json,status,paid_at,period_start,period_end,notes,created_at,updated_at) VALUES (?,?,?,?,?,'mercadopago',?,?,?,?,?,?,?,?,?,NOW(),NOW()) ON DUPLICATE KEY UPDATE provider_payment_id=VALUES(provider_payment_id),provider_status=VALUES(provider_status),raw_response_json=VALUES(raw_response_json),status=VALUES(status),paid_at=VALUES(paid_at),period_start=VALUES(period_start),period_end=VALUES(period_end),updated_at=NOW()`, [current.id,current.business_id,current.plan_id,Number(invoice.transaction_amount || current.amount),invoice.currency_id || current.currency,String(invoice.id),invoice.payment?.id ? String(invoice.payment.id) : null,paymentStatus,JSON.stringify(invoice),localPaymentStatus,paidAt,periodStart,periodEnd,`Cuota automática Mercado Pago · ${invoice.id}`]);
    if (localPaymentStatus === "approved") {
      await conn.query("UPDATE tags_subscriptions SET status='active',provider_status='authorized',started_at=COALESCE(started_at,?),expires_at=?,next_billing_at=?,provider_next_payment_at=?,provider_last_synced_at=NOW(),auto_renew=1,updated_at=NOW() WHERE id=?", [periodStart,periodEnd,periodEnd,periodEnd,current.id]);
      await conn.query("UPDATE tags_businesses SET plan_id=?,subscription_status='active',plan_started_at=COALESCE(plan_started_at,?),plan_expires_at=?,updated_at=NOW() WHERE id=?", [current.plan_id,periodStart,periodEnd,current.business_id]);
      await conn.query("UPDATE tags_business_addons SET status='active',expires_at=?,updated_at=NOW() WHERE business_id=? AND addon_code='directory'", [periodEnd,current.business_id]);
      await conn.query("UPDATE tags_directory_listings SET status='published',updated_at=NOW() WHERE business_id=?", [current.business_id]);
      await conn.query("UPDATE tags_directory_site_listings sl INNER JOIN tags_directory_listings l ON l.id=sl.listing_id SET sl.is_free=0,sl.publication_status='published',sl.published_at=COALESCE(sl.published_at,NOW()),sl.updated_at=NOW() WHERE l.business_id=?", [current.business_id]);
      await conn.query("UPDATE tags_qr_pages SET status='published',updated_at=NOW() WHERE business_id=? AND page_type='directory'", [current.business_id]);
    } else if (localPaymentStatus === "rejected") {
      await conn.query("UPDATE tags_subscriptions SET status=IF(expires_at IS NULL OR expires_at<=NOW(),'past_due',status),provider_status=?,provider_last_synced_at=NOW(),updated_at=NOW() WHERE id=?", [paymentStatus,current.id]);
    }
    await conn.commit();
    const [[notification]] = await db.query(`SELECT b.name business_name,b.email,p.name plan_name,ds.name site_name,ds.primary_host,ds.brand_config FROM tags_businesses b INNER JOIN tags_plans p ON p.id=? LEFT JOIN tags_directory_listings l ON l.business_id=b.id LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id LEFT JOIN tags_directory_sites ds ON ds.id=sl.site_id WHERE b.id=? ORDER BY ds.id LIMIT 1`,[current.plan_id,current.business_id]);
    if (notification?.email && ["approved","rejected"].includes(localPaymentStatus)) {
      const brand = directoryEmailBranding(notification);
      const approved = localPaymentStatus === "approved";
      const contactBlock = directoryEmailContact(brand);
      await sendMail({to:notification.email,fromName:brand.name,fromEmail:brand.fromEmail,replyTo:brand.replyTo,subject:`${approved ? "Pago automático acreditado" : "No pudimos procesar el pago automático"} · ${brand.name}`,text:`${approved ? `Acreditamos tu pago automático. Tu suscripción está vigente hasta ${periodEnd.toLocaleDateString("es-AR")}.` : "Mercado Pago informó que no pudo procesar la cuota automática. Revisá el medio de pago asociado."} ${contactBlock.text}`,html:`<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226;border:1px solid #dce9e1;border-radius:16px;overflow:hidden">${directoryEmailHeader(brand,approved ? "Pago automático acreditado" : "Pago automático rechazado")}<main style="padding:24px"><p>Hola <strong>${notification.business_name}</strong>,</p><p>${approved ? `Acreditamos la cuota de tu plan ${notification.plan_name}. La nueva vigencia es hasta el ${periodEnd.toLocaleDateString("es-AR")}.` : "Mercado Pago no pudo procesar la cuota automática. Revisá el medio de pago asociado para evitar la interrupción del servicio."}</p>${contactBlock.html}</main></div>`});
    }
    return { subscriptionId: current.id, paymentStatus: localPaymentStatus };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const resourceId = body?.data?.id || body?.id || new URL(req.url).searchParams.get("data.id");
  const eventType = String(body?.type || body?.topic || body?.action || "");
  if (!resourceId) return Response.json({ ok: true, ignored: true });
  if (!validSignature(req, resourceId)) return Response.json({ error: "Webhook no autorizado" }, { status: 401 });
  const requestId = req.headers.get("x-request-id") || "";
  const eventKey = requestId || createHash("sha256").update(`${eventType}:${resourceId}:${JSON.stringify(body)}`).digest("hex");
  const [insert] = await db.query(`INSERT IGNORE INTO tags_subscription_provider_events (provider,event_key,event_type,resource_id,processing_status,request_id,payload_json,created_at,updated_at) VALUES ('mercadopago',?,?,?,'received',?,?,NOW(),NOW())`, [eventKey,eventType,String(resourceId),requestId || null,JSON.stringify(body)]);
  if (!insert.affectedRows) return Response.json({ ok: true, duplicate: true });
  try {
    let result;
    if (eventType.includes("authorized_payment")) result = await syncInvoice(await getDirectoryMercadoPagoInvoice(resourceId));
    else if (eventType.includes("preapproval") && !eventType.includes("plan")) result = await syncPreapproval(await getDirectoryMercadoPagoPreapproval(resourceId));
    else result = { ignored: true };
    await db.query("UPDATE tags_subscription_provider_events SET subscription_id=?,processing_status=?,processed_at=NOW(),updated_at=NOW() WHERE provider='mercadopago' AND event_key=?", [result?.subscriptionId || null,result?.ignored ? "ignored" : "processed",eventKey]);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    await db.query("UPDATE tags_subscription_provider_events SET processing_status='failed',error_message=?,processed_at=NOW(),updated_at=NOW() WHERE provider='mercadopago' AND event_key=?", [String(error.message || error).slice(0,2000),eventKey]);
    console.error("DIRECTORY MERCADOPAGO WEBHOOK ERROR", error);
    return Response.json({ error: "No se pudo procesar la notificación" }, { status: 500 });
  }
}
