import { db } from "@/app/lib/tags-db";
import { requireDirectoryAdmin, directoryAdminError } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { sendMail } from "@/app/lib/sendMail";
import { directoryEmailBranding, directoryEmailContact, directoryEmailHeader } from "@/app/modules/directory/lib/directoryEmailBranding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const { searchParams } = new URL(req.url);
  const search = String(searchParams.get("search") || "").trim().slice(0, 120);
  const status = String(searchParams.get("status") || "all");
  const provider = String(searchParams.get("provider") || "all");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = 20;
  const conditions = ["pl.code IN ('directory_web','directory_web_plus')"];
  const params = [];
  if (search) { const term = `%${search}%`; conditions.push("(b.name LIKE ? OR b.email LIKE ?)"); params.push(term, term); }
  if (status !== "all") { conditions.push("pay.status=?"); params.push(status); }
  if (provider !== "all") { conditions.push("pay.provider=?"); params.push(provider); }
  const where = conditions.join(" AND ");
  const [[count]] = await db.query(`SELECT COUNT(*) total FROM tags_subscription_payments pay INNER JOIN tags_businesses b ON b.id=pay.business_id INNER JOIN tags_plans pl ON pl.id=pay.plan_id WHERE ${where}`, params);
  const [payments] = await db.query(`SELECT pay.*,b.name business_name,b.email business_email,pl.name plan_name,pl.code plan_code FROM tags_subscription_payments pay INNER JOIN tags_businesses b ON b.id=pay.business_id INNER JOIN tags_plans pl ON pl.id=pay.plan_id WHERE ${where} ORDER BY COALESCE(pay.paid_at,pay.created_at) DESC,pay.id DESC LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
  const [subscriptions] = await db.query(`SELECT s.id,b.name business_name,b.email,pl.name plan_name,s.amount,s.currency,s.duration_months,s.expires_at FROM tags_subscriptions s INNER JOIN tags_businesses b ON b.id=s.business_id INNER JOIN tags_plans pl ON pl.id=s.plan_id WHERE pl.code IN ('directory_web','directory_web_plus') AND s.status IN ('active','trial','inactive','past_due') ORDER BY b.name,s.id DESC`);
  const [pendingSubscriptions] = await db.query(`
    SELECT s.id subscription_id,s.business_id,s.plan_id,s.amount,s.currency,s.duration_months,s.payment_provider,s.created_at,s.expires_at,
           b.name business_name,b.email business_email,pl.name plan_name
      FROM tags_subscriptions s
      INNER JOIN tags_businesses b ON b.id=s.business_id
      INNER JOIN tags_plans pl ON pl.id=s.plan_id
     WHERE pl.code IN ('directory_web','directory_web_plus')
       AND s.status='trial'
       AND NOT EXISTS (SELECT 1 FROM tags_subscription_payments pay WHERE pay.subscription_id=s.id AND pay.status IN ('pending','approved'))
     ORDER BY s.created_at DESC,s.id DESC
  `);
  return Response.json({ ok: true, payments, pendingSubscriptions, subscriptions, page, pageSize, total: Number(count?.total || 0) });
}

export async function POST(req) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const body = await req.json().catch(() => null);
  const action = String(body?.action || "create");
  if (action === "cancel") return cancelPayment(body, access);
  const subscriptionId = Number(body?.subscriptionId || 0);
  const provider = ["manual", "transfer", "cash", "mercadopago"].includes(body?.provider) ? body.provider : "manual";
  const amount = Number(body?.amount || 0);
  const paidAt = body?.paidAt ? new Date(`${body.paidAt}T12:00:00`) : new Date();
  const notes = String(body?.notes || "").trim().slice(0, 1000) || null;
  if (!subscriptionId || amount <= 0 || Number.isNaN(paidAt.getTime())) return Response.json({ error: "Faltan suscripción, importe o fecha" }, { status: 400 });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[subscription]] = await conn.query(`SELECT s.*,p.name plan_name,b.name business_name,b.email business_email,(SELECT ds.id FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id INNER JOIN tags_directory_sites ds ON ds.id=sl.site_id WHERE l.business_id=s.business_id ORDER BY ds.id LIMIT 1) site_id FROM tags_subscriptions s INNER JOIN tags_plans p ON p.id=s.plan_id INNER JOIN tags_businesses b ON b.id=s.business_id WHERE s.id=? AND p.code IN ('directory_web','directory_web_plus') LIMIT 1 FOR UPDATE`, [subscriptionId]);
    if (!subscription) { await conn.rollback(); return Response.json({ error: "Suscripción no encontrada" }, { status: 404 }); }
    const periodStart = subscription.status === "trial" || !subscription.expires_at || new Date(subscription.expires_at) < paidAt ? paidAt : new Date(subscription.expires_at);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + Number(subscription.duration_months || 1));
    const [[pendingPayment]] = await conn.query("SELECT id FROM tags_subscription_payments WHERE subscription_id=? AND status='pending' ORDER BY id DESC LIMIT 1 FOR UPDATE", [subscription.id]);
    if (pendingPayment) {
      await conn.query("UPDATE tags_subscription_payments SET amount=?,currency=?,provider=?,status='approved',paid_at=?,period_start=?,period_end=?,notes=?,created_by=? WHERE id=?", [amount, subscription.currency || "ARS", provider, paidAt, periodStart, periodEnd, notes || "Pago imputado por administración", Number(access.session?.businessId || 0) || null, pendingPayment.id]);
    } else {
      await conn.query(`INSERT INTO tags_subscription_payments (subscription_id,business_id,plan_id,amount,currency,provider,status,paid_at,period_start,period_end,notes,created_by,created_at) VALUES (?,?,?,?,?,?, 'approved',?,?,?,?,?,NOW())`, [subscription.id, subscription.business_id, subscription.plan_id, amount, subscription.currency || "ARS", provider, paidAt, periodStart, periodEnd, notes, Number(access.session?.businessId || 0) || null]);
    }
    await conn.query("UPDATE tags_subscriptions SET status='active',payment_provider=?,amount=?,started_at=COALESCE(started_at,?),expires_at=?,next_billing_at=?,updated_at=NOW() WHERE id=?", [provider, amount, periodStart, periodEnd, periodEnd, subscription.id]);
    await conn.query("UPDATE tags_businesses SET plan_id=?,subscription_status='active',plan_expires_at=?,updated_at=NOW() WHERE id=?", [subscription.plan_id, periodEnd, subscription.business_id]);
    await conn.query("UPDATE tags_business_addons SET status='active',expires_at=?,updated_at=NOW() WHERE business_id=? AND addon_code IN ('directory','client_reviews')", [periodEnd, subscription.business_id]);
    await conn.query("UPDATE tags_directory_listings SET status='published',updated_at=NOW() WHERE business_id=?", [subscription.business_id]);
    await conn.query(`UPDATE tags_directory_site_listings sl INNER JOIN tags_directory_listings l ON l.id=sl.listing_id SET sl.is_free=0,sl.publication_status='published',sl.updated_at=NOW() WHERE l.business_id=?`, [subscription.business_id]);
    await conn.query("UPDATE tags_qr_pages SET status='published',updated_at=NOW() WHERE business_id=? AND page_type='directory'", [subscription.business_id]);
    await conn.commit();
    const [[site]] = await db.query("SELECT name,primary_host,brand_config FROM tags_directory_sites WHERE id=? LIMIT 1", [subscription.site_id]);
    const brand = directoryEmailBranding(site || {});
    const contactBlock = directoryEmailContact(brand);
    await sendMail({ to: subscription.business_email, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject: `Pago acreditado · ${brand.name}`, text: `Acreditamos tu pago de ${subscription.currency || "ARS"} ${amount}. Tu suscripción vence el ${periodEnd.toLocaleDateString("es-AR")}. ${contactBlock.text}`, html: `<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226;border:1px solid #dce9e1;border-radius:16px;overflow:hidden">${directoryEmailHeader(brand, "Pago acreditado")}<main style="padding:24px"><p>Hola <strong>${subscription.business_name}</strong>,</p><p>Registramos correctamente tu pago.</p><p><strong>Plan:</strong> ${subscription.plan_name}<br><strong>Importe:</strong> ${subscription.currency || "ARS"} ${amount.toLocaleString("es-AR")}<br><strong>Vigencia hasta:</strong> ${periodEnd.toLocaleDateString("es-AR")}</p>${contactBlock.html}</main></div>` });
    return Response.json({ ok: true, expiresAt: periodEnd });
  } catch (error) {
    await conn.rollback();
    console.error("DIRECTORY PAYMENT CREATE ERROR", error);
    return Response.json({ error: "No se pudo imputar el pago" }, { status: 500 });
  } finally { conn.release(); }
}

async function cancelPayment(body, access) {
  const paymentId = Number(body?.paymentId || 0);
  const reason = String(body?.reason || "Anulado por administración").trim().slice(0, 1000);
  if (!paymentId) return Response.json({ error: "Falta el pago" }, { status: 400 });
  const [result] = await db.query(`UPDATE tags_subscription_payments pay INNER JOIN tags_plans p ON p.id=pay.plan_id SET pay.status='cancelled',pay.notes=CONCAT(COALESCE(pay.notes,''),?,NOW(),?,' [admin ',?,']') WHERE pay.id=? AND pay.status<>'cancelled' AND p.code IN ('directory_web','directory_web_plus')`, ["\nAnulado ", `: ${reason}`, Number(access.session?.businessId || 0) || 0, paymentId]);
  if (!result.affectedRows) return Response.json({ error: "El pago no existe o ya está anulado" }, { status: 409 });
  return Response.json({ ok: true });
}
