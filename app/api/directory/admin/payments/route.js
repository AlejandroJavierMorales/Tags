import { db } from "@/app/lib/tags-db";
import { requireDirectoryAdmin, directoryAdminError } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { sendMail } from "@/app/lib/sendMail";
import { directoryEmailBranding, directoryEmailContact, directoryEmailHeader } from "@/app/modules/directory/lib/directoryEmailBranding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const [rows] = await db.query(`
    SELECT s.id subscription_id,s.business_id,s.plan_id,s.amount,s.currency,s.duration_months,s.status,s.payment_provider,s.started_at,s.expires_at,
           b.name business_name,b.email business_email,pl.name plan_name,
           ds.name site_name
    FROM tags_subscriptions s
    INNER JOIN tags_businesses b ON b.id=s.business_id
    INNER JOIN tags_plans pl ON pl.id=s.plan_id
    LEFT JOIN tags_directory_listings dl ON dl.business_id=b.id
    LEFT JOIN tags_directory_site_listings dsl ON dsl.listing_id=dl.id
    LEFT JOIN tags_directory_sites ds ON ds.id=dsl.site_id
    WHERE s.status='trial' AND EXISTS (SELECT 1 FROM tags_business_addons ba WHERE ba.business_id=s.business_id AND ba.addon_code='directory')
    ORDER BY s.created_at DESC,s.id DESC
  `);
  return Response.json({ ok: true, payments: rows });
}

export async function POST(req) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const body = await req.json().catch(() => null);
  const subscriptionId = Number(body?.subscriptionId || 0);
  const notes = String(body?.notes || "Pago manual confirmado por administración").trim().slice(0, 1000);
  if (!subscriptionId) return Response.json({ error: "Falta la suscripción" }, { status: 400 });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query("SELECT s.* FROM tags_subscriptions s WHERE s.id=? AND s.status='trial' AND EXISTS (SELECT 1 FROM tags_business_addons ba WHERE ba.business_id=s.business_id AND ba.addon_code='directory') LIMIT 1 FOR UPDATE", [subscriptionId]);
    const subscription = rows[0];
    if (!subscription) {
      await conn.rollback();
      return Response.json({ error: "La inscripción no está pendiente o ya fue procesada" }, { status: 409 });
    }
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + Number(subscription.duration_months || 1));
    const [[pendingPayment]] = await conn.query("SELECT id FROM tags_subscription_payments WHERE subscription_id=? AND status='pending' ORDER BY id DESC LIMIT 1 FOR UPDATE", [subscription.id]);
    if (pendingPayment) await conn.query("UPDATE tags_subscription_payments SET amount=?,currency=?,provider=?,status='approved',paid_at=NOW(),period_start=?,period_end=?,notes=? WHERE id=?", [subscription.amount || 0, subscription.currency || "ARS", subscription.payment_provider || "manual", periodStart, periodEnd, notes, pendingPayment.id]);
    else await conn.query(`INSERT INTO tags_subscription_payments (subscription_id,business_id,plan_id,amount,currency,provider,status,paid_at,period_start,period_end,notes,created_at) VALUES (?,?,?,?,?,'manual','approved',NOW(),?,?,?,NOW())`, [subscription.id, subscription.business_id, subscription.plan_id, subscription.amount || 0, subscription.currency || "ARS", periodStart, periodEnd, notes]);
    await conn.query("UPDATE tags_subscriptions SET status='active',payment_provider='manual',started_at=?,expires_at=?,next_billing_at=?,updated_at=NOW() WHERE id=?", [periodStart, periodEnd, periodEnd, subscription.id]);
    await conn.query("UPDATE tags_businesses SET subscription_status='active',plan_started_at=?,plan_expires_at=?,updated_at=NOW() WHERE id=?", [periodStart, periodEnd, subscription.business_id]);
    await conn.query("UPDATE tags_business_addons SET status='active',started_at=?,expires_at=?,updated_at=NOW() WHERE business_id=? AND addon_code IN ('directory','client_reviews')", [periodStart, periodEnd, subscription.business_id]);
    await conn.query("UPDATE tags_directory_listings SET status='published',updated_at=NOW() WHERE business_id=?", [subscription.business_id]);
    await conn.query(`UPDATE tags_directory_site_listings dsl INNER JOIN tags_directory_listings dl ON dl.id=dsl.listing_id SET dsl.publication_status='published',dsl.published_at=COALESCE(dsl.published_at,NOW()),dsl.updated_at=NOW() WHERE dl.business_id=?`, [subscription.business_id]);
    await conn.commit();
    const [[notification]] = await db.query(`SELECT b.name business_name,b.email business_email,p.name plan_name,ds.name site_name,ds.primary_host,ds.brand_config FROM tags_businesses b INNER JOIN tags_plans p ON p.id=? LEFT JOIN tags_directory_listings l ON l.business_id=b.id LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id LEFT JOIN tags_directory_sites ds ON ds.id=sl.site_id WHERE b.id=? ORDER BY ds.id LIMIT 1`, [subscription.plan_id, subscription.business_id]);
    if (notification?.business_email) {
      const brand = directoryEmailBranding(notification);
      const contactBlock = directoryEmailContact(brand);
      await sendMail({ to: notification.business_email, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject: `Pago acreditado · ${brand.name}`, text: `Acreditamos tu pago. Tu suscripción vence el ${periodEnd.toLocaleDateString("es-AR")}. ${contactBlock.text}`, html: `<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226;border:1px solid #dce9e1;border-radius:16px;overflow:hidden">${directoryEmailHeader(brand, "Pago acreditado")}<main style="padding:24px"><p>Hola <strong>${notification.business_name}</strong>,</p><p>Registramos correctamente tu pago.</p><p><strong>Plan:</strong> ${notification.plan_name}<br><strong>Importe:</strong> ${subscription.currency || "ARS"} ${Number(subscription.amount || 0).toLocaleString("es-AR")}<br><strong>Vigencia hasta:</strong> ${periodEnd.toLocaleDateString("es-AR")}</p>${contactBlock.html}</main></div>` });
    }
    return Response.json({ ok: true, expiresAt: periodEnd });
  } catch (error) {
    await conn.rollback();
    console.error("DIRECTORY MANUAL PAYMENT ERROR", error);
    return Response.json({ error: "No se pudo confirmar el pago" }, { status: 500 });
  } finally { conn.release(); }
}
