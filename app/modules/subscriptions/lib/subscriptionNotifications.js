import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";
import { directoryEmailBranding, directoryEmailHeader } from "@/app/modules/directory/lib/directoryEmailBranding";

const escapeHtml = value => String(value || "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export async function notifySubscriptionCreated({ subscriptionId }) {
  const [[row]] = await db.query(`
    SELECT s.id,s.status,s.payment_provider,s.amount,s.currency,s.duration_months,s.expires_at,
           b.name business_name,b.email business_email,p.name plan_name,
           ds.name site_name,ds.primary_host,ds.brand_config
    FROM tags_subscriptions s
    INNER JOIN tags_businesses b ON b.id=s.business_id
    INNER JOIN tags_plans p ON p.id=s.plan_id
    LEFT JOIN tags_directory_listings l ON l.business_id=b.id
    LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
    LEFT JOIN tags_directory_sites ds ON ds.id=sl.site_id
    WHERE s.id=? LIMIT 1
  `, [subscriptionId]);
  if (!row) return;
  const brand = directoryEmailBranding(row.site_name ? { name: row.site_name, primary_host: row.primary_host, brand_config: row.brand_config } : { name: "Tags", primary_host: "tags.com.ar", brand_config: null });
  const provider = row.payment_provider === "mercadopago" ? "Mercado Pago automático" : row.payment_provider === "transfer" ? "Transferencia" : "Pago manual";
  const status = row.status === "active" ? "Activa" : row.status === "trial" ? "Prueba / período de gracia" : row.status === "inactive" ? "Pendiente de activación" : row.status;
  const expires = row.expires_at ? new Date(row.expires_at).toLocaleDateString("es-AR") : "Sin vencimiento";
  const manual = row.payment_provider !== "mercadopago" ? `<p><strong>Datos para pagar:</strong><br>Titular: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_HOLDER)}<br>Alias: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_ALIAS)}<br>CBU/CVU: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_CBU)}<br>Cuenta: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_ACCOUNT)}</p><p>Enviá el comprobante por WhatsApp o email para imputar el pago.</p>` : "";
  const subject = `Suscripción registrada · ${brand.name}`;
  const text = `Plan: ${row.plan_name}. Estado: ${status}. Modalidad: ${provider}. Importe: ARS ${Number(row.amount || 0).toLocaleString("es-AR")}. Duración: ${Number(row.duration_months || 1)} meses. Vencimiento: ${expires}.`;
  const html = `<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226;border:1px solid #dce9e1;border-radius:16px;overflow:hidden">${directoryEmailHeader(brand, "Suscripción registrada")}<main style="padding:24px"><p>Hola <strong>${escapeHtml(row.business_name)}</strong>,</p><p>Registramos correctamente tu suscripción.</p><p><strong>Plan:</strong> ${escapeHtml(row.plan_name)}<br><strong>Estado:</strong> ${escapeHtml(status)}<br><strong>Modalidad:</strong> ${escapeHtml(provider)}<br><strong>Importe:</strong> ARS ${Number(row.amount || 0).toLocaleString("es-AR")}<br><strong>Duración:</strong> ${Number(row.duration_months || 1)} meses<br><strong>Vencimiento:</strong> ${expires}</p>${manual}</main></div>`;
  if (row.business_email) await sendMail({ to: row.business_email, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject, text, html });
  const [admins] = await db.query("SELECT email FROM tags_businesses WHERE role='admin' AND email IS NOT NULL");
  const recipients = [...new Set([brand.notificationEmail, ...admins.map(item => item.email)].filter(Boolean))];
  if (recipients.length) await sendMail({ to: recipients, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject: `${subject} · Plataforma`, text: `${row.business_name}: ${text}`, html });
}
