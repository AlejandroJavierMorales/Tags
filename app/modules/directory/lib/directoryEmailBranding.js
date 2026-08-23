function parseConfig(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

export function directoryEmailBranding(site) {
  const config = parseConfig(site?.brand_config);
  const mailgunDomain = String(process.env.MAILGUN_DOMAIN || "").trim().toLowerCase();
  const configuredFrom = String(config.emailFrom || "").trim().toLowerCase();
  const siteDomain = String(site?.primary_host || "").trim().toLowerCase().replace(/^www\./, "");
  const fromEmail = configuredFrom || (siteDomain ? `no-reply@${siteDomain}` : mailgunDomain ? `no-reply@${mailgunDomain}` : null);
  return {
    name: config.displayName || site?.name || "Directorio",
    logo: config.logoUrl || config.logo_url || "",
    color: config.primaryColor || "#2f7958",
    fromEmail,
    replyTo: config.replyTo || null,
    notificationEmail: config.notificationEmail || config.replyTo || process.env.DIRECTORY_ADMIN_NOTIFICATION_EMAIL || null
  };
}

export function directoryEmailHeader(brand, subtitle = "") {
  const identity = brand.logo
    ? `<img src="${brand.logo}" alt="${brand.name}" style="display:block;max-width:230px;max-height:90px;width:auto;height:auto;margin:0 auto 12px">`
    : "";
  return `<header style="padding:24px;text-align:center;background:#f1f8f3">${identity}${subtitle ? `<p style="margin:0;color:#4d675a">${subtitle}</p>` : ""}</header>`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

export function directoryEmailContact(brand, { manualPayment = false } = {}) {
  const whatsapp = String(process.env.NEXT_PUBLIC_PLATFORM_WHATSAPP || "").trim();
  const phone = String(process.env.NEXT_PUBLIC_PLATFORM_PHONE || whatsapp).trim();
  const email = String(brand?.replyTo || brand?.notificationEmail || "").trim();
  const digits = whatsapp.replace(/\D/g, "");
  const rows = [
    phone ? `<div><strong>Teléfono:</strong> ${escapeHtml(phone)}</div>` : "",
    whatsapp ? `<div><strong>WhatsApp:</strong> <a href="https://wa.me/${digits}" style="color:${escapeHtml(brand?.color || "#2f7958")}">${escapeHtml(whatsapp)}</a></div>` : "",
    email ? `<div><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}" style="color:${escapeHtml(brand?.color || "#2f7958")}">${escapeHtml(email)}</a></div>` : ""
  ].filter(Boolean);
  const manual = manualPayment ? "<p style=\"margin:12px 0 0\"><strong>Pago manual:</strong> enviá el comprobante por WhatsApp o por email para que podamos imputarlo.</p>" : "";
  return {
    text: [phone && `Teléfono: ${phone}`, whatsapp && `WhatsApp: ${whatsapp}`, email && `Email: ${email}`, manualPayment && "Pago manual: enviá el comprobante por WhatsApp o email para imputarlo."].filter(Boolean).join(" · "),
    html: rows.length || manualPayment ? `<div style="margin-top:20px;padding:14px;background:#f7faf8;border:1px solid #dce9e1;border-radius:9px"><strong>Contacto</strong>${rows.join("")}${manual}</div>` : ""
  };
}
