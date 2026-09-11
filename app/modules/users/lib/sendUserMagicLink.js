import crypto from "crypto";
import { db } from "@/app/lib/tags-db";
import { sendMagicLink } from "@/app/lib/mailgun";
import { getRequestBaseUrl } from "@/app/lib/channelContext";

export async function sendUserMagicLink({ request, user, channel, returnTo = "" }) {
    const baseUrl = getRequestBaseUrl(request);
    if (!baseUrl) throw new Error("No se pudo determinar la URL pública del acceso");

    const token = `u_${crypto.randomBytes(48).toString("hex")}`;
    await db.query(
        `INSERT INTO tags_user_auth_tokens
            (user_id,email,token,context_code,expires_at,requested_ip,user_agent)
         VALUES (?,?,?,?,DATE_ADD(NOW(), INTERVAL 15 MINUTE),?,?)`,
        [
            user.id,
            user.email,
            token,
            channel?.code || "tags",
            request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
            request.headers.get("user-agent") || null
        ]
    );

    const brand = channel?.brandConfig || {};
    const mailEnvSuffix = String(channel?.code || "tags").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    const safeReturnTo = String(returnTo || "").startsWith("/") && !String(returnTo).startsWith("//") ? String(returnTo) : "";
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}${safeReturnTo ? `&returnTo=${encodeURIComponent(safeReturnTo)}` : ""}`;
    const mailResult = await sendMagicLink(user.email, verifyUrl, {
        name: brand.displayName || channel?.name || "Tags",
        logo: brand.logoUrl || brand.logo_url || "",
        color: brand.primaryColor || "#0fb957",
        from: brand.mailFrom || brand.mail_from || process.env[`MAILGUN_FROM_${mailEnvSuffix}`] || process.env.MAILGUN_FROM,
        mailgunDomain: brand.mailgunDomain || brand.mailgun_domain || process.env[`MAILGUN_DOMAIN_${mailEnvSuffix}`] || process.env.MAILGUN_DOMAIN,
        accountType: "user",
    });

    return { messageId: mailResult?.id || null };
}
