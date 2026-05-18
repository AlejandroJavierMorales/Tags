import Mailgun from "mailgun.js";
import formData from "form-data";

const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});

export async function sendMagicLink(email, link) {
  return mg.messages.create(process.env.MAILGUN_DOMAIN, {
    from: process.env.MAILGUN_FROM,
    to: [email],
    subject: "Acceso a tu panel",
    html: `
      <h2>Acceso a tu cuenta</h2>
      <p>Hacé click en el botón para ingresar:</p>
      <a href="${link}" style="padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:5px;">
        Entrar al panel
      </a>
      <p>Este link expira en 15 minutos.</p>
    `,
  });
}