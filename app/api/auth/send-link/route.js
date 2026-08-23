import { sendMagicLink } from "@/app/lib/mailgun";
import { db } from "@/app/lib/tags-db";
import {
    canBusinessAccessChannel,
    getChannelContextFromHost,
    getRequestBaseUrl,
    getRequestHost,
} from "@/app/lib/channelContext";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import crypto from "crypto";

export async function POST(req) {
    const body = await req.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
        return Response.json({ error: "Email requerido" }, { status: 400 });
    }

    const channel = await getChannelContextFromHost(getRequestHost(req));

    // buscar cliente
    const [rows] = await db.execute(
        `SELECT b.id,b.role,b.subscription_status,p.is_free,p.code AS plan_code,
                ds.status AS directory_subscription_status,ds.plan_id AS directory_plan_id,ds.amount AS directory_subscription_amount,sp.code AS directory_plan_code
           FROM tags_businesses b
           LEFT JOIN tags_plans p ON p.id=b.plan_id
           LEFT JOIN tags_subscriptions ds ON ds.id=(
             SELECT s2.id FROM tags_subscriptions s2
             WHERE s2.business_id=b.id AND s2.status IN ('active','trial','past_due')
             ORDER BY s2.id DESC LIMIT 1
           )
           LEFT JOIN tags_plans sp ON sp.id=ds.plan_id
          WHERE LOWER(b.email) = ?`,
        [email]
    );

    const business = rows[0];

    if (!business) {
        return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const hasPaidDirectorySubscription = Number(business.directory_subscription_amount || 0) > 0
        && ["active", "trial", "past_due"].includes(business.directory_subscription_status);

    if (business.role !== "admin" && Number(business.is_free) === 1 && !hasPaidDirectorySubscription) {
        return Response.json(
            { error: "Tu ficha gratuita está publicada en el Directorio, pero el acceso al Panel de Control requiere contratar un plan pago." },
            { status: 402 }
        );
    }

    const allowed = business.role === "admin"
        ? channel.isTags
        : await canBusinessAccessChannel({ businessId: business.id, channel });

    if (!allowed) {
        return Response.json(
            { error: "Este cliente no está habilitado para este canal" },
            { status: 403 }
        );
    }

    const token = crypto.randomUUID();

    await db.execute(`
    INSERT INTO tags_auth_tokens (email, token, expires_at)
    VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
  `, [email, token]);

    const baseUrl = getRequestBaseUrl(req);

    if (!baseUrl) {
        return Response.json({ error: "No se pudo determinar la URL pública del acceso" }, { status: 500 });
    }
        
    const link = `${baseUrl}/api/auth/verify?token=${token}`;


    const brand = channel.brandConfig || {};
    const mailEnvSuffix = String(channel.code || "tags").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    const channelMailFrom = brand.mailFrom || brand.mail_from || process.env[`MAILGUN_FROM_${mailEnvSuffix}`] || process.env.MAILGUN_FROM;
    const channelMailgunDomain = brand.mailgunDomain || brand.mailgun_domain || process.env[`MAILGUN_DOMAIN_${mailEnvSuffix}`] || process.env.MAILGUN_DOMAIN;
    await sendMagicLink(email, link, {
        name: brand.displayName || channel.name || "Tags",
        logo: brand.logoUrl || brand.logo_url || "",
        color: brand.primaryColor || "#0fb957",
        from: channelMailFrom,
        mailgunDomain: channelMailgunDomain,
    });

    // 👉 acá después metemos Mailgun

    return Response.json({ ok: true });
}

async function hasActiveDirectoryAddon(businessId) {
    const [rows] = await db.execute(
        `SELECT id FROM tags_business_addons
         WHERE business_id=? AND addon_code='directory' AND status='active'
         LIMIT 1`,
        [businessId]
    );
    return rows.length > 0;
}

async function hasPaidDirectoryListing(businessId) {
    const [rows] = await db.execute(
        `SELECT dsl.id
         FROM tags_directory_site_listings dsl
         INNER JOIN tags_directory_listings dl ON dl.id=dsl.listing_id
         WHERE dl.business_id=? AND dsl.is_free=0 AND dsl.publication_status IN ('published','draft')
         LIMIT 1`,
        [businessId]
    );
    return rows.length > 0;
}
