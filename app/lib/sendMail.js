import Mailgun from "mailgun.js";
import formData from "form-data";

const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});



export async function sendMail({
  to,
  subject,
  html,
  text = null,
  fromName = null,
  fromEmail = null,
  replyTo = null
}) {
  try {
    const configuredFrom = String(process.env.MAILGUN_FROM || "").trim();
    const fallbackEmail = configuredFrom.match(/<([^>]+)>/)?.[1] || configuredFrom;
    const senderName = String(fromName || "Notificaciones").replace(/[<>\r\n]/g, "");
    const senderEmail = String(fromEmail || fallbackEmail).replace(/[<>\r\n]/g, "").trim();

    const result =
      await mg.messages.create(
        process.env.MAILGUN_DOMAIN,
        {
          from: `${senderName} <${senderEmail}>`,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text,
          ...(replyTo ? { "h:Reply-To": replyTo } : {})
        }
      );

    return {
      ok: true,
      result
    };

  } catch (error) {

    console.error(
      "[MAILGUN ERROR]",
      error
    );

    return {
      ok: false,
      error: error.message
    };
  }
}
