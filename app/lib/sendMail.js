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
  text = null
}) {
  try {

    const result =
      await mg.messages.create(
        process.env.MAILGUN_DOMAIN,
        {
          from: process.env.MAILGUN_FROM,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text
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