import Mailgun from "mailgun.js";
import formData from "form-data";

const mailgun = new Mailgun(formData);
const mg = mailgun.client({ username: "api", key: process.env.MAILGUN_API_KEY });

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  })[character]);
}

function absoluteAssetUrl(value, link) {
  const asset = String(value || "").trim();
  if (!asset) return "";
  try { return new URL(asset, new URL(link).origin).toString(); } catch { return ""; }
}

export async function sendMagicLink(email, link, branding = {}) {
  const name = String(branding.name || "Tags").trim();
  const color = String(branding.color || "#0fb957").trim();
  const logo = absoluteAssetUrl(branding.logo, link);
  const safeLink = escapeHtml(link);
  const from = String(branding.from || process.env.MAILGUN_FROM || "").trim();
  const sendingDomain = String(branding.mailgunDomain || process.env.MAILGUN_DOMAIN || "").trim();

  return mg.messages.create(sendingDomain, {
    from,
    to: [email],
    subject: `Acceso a tu panel de ${name}`,
    text: `Ingresá a tu panel desde este enlace: ${link}\n\nEl enlace expira en 15 minutos y puede utilizarse una sola vez.`,
    html: `
      <div style="margin:0;padding:24px;background:#f3f7f4;font-family:Arial,sans-serif;color:#24332a">
        <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #dfe9e2;border-radius:12px;overflow:hidden">
          <div style="padding:22px;text-align:center;background:#f7fbf8">
            ${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name)}" width="220" style="display:block;max-width:220px;max-height:90px;width:auto;height:auto;margin:auto">` : `<strong style="font-size:22px">${escapeHtml(name)}</strong>`}
          </div>
          <div style="padding:30px;text-align:center">
            <h2 style="margin:0 0 12px">Acceso a tu cuenta</h2>
            <p style="margin:0 0 24px;color:#5c6d62">Hacé clic en el botón para ingresar a tu Panel de Administración.</p>
            <p style="margin:0 0 24px"><a href="${safeLink}" target="_blank" style="display:inline-block;padding:13px 24px;background:${escapeHtml(color)};color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Ingresar a mi panel</a></p>
            <p style="margin:0 0 8px;color:#78867d;font-size:13px">Si el botón no abre, copiá y pegá este enlace:</p>
            <p style="margin:0;word-break:break-all;font-size:13px"><a href="${safeLink}" target="_blank" style="color:#176b3b">${safeLink}</a></p>
            <p style="margin:22px 0 0;color:#78867d;font-size:12px">El enlace expira en 15 minutos y puede utilizarse una sola vez.</p>
          </div>
        </div>
      </div>
    `,
  });
}
