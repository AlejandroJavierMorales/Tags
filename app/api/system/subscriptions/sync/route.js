// =====================================
// API: /api/system/subscriptions/sync
// Descripción: Sincroniza vencimientos de suscripciones y addons respetando excepciones admin.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";
import { directoryEmailBranding, directoryEmailHeader } from "@/app/modules/directory/lib/directoryEmailBranding";

const escapeHtml = value => String(value || "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

async function notifyUpcomingExpirations() {
    const [rows] = await db.query(`
        SELECT s.id,s.business_id,s.status,s.amount,s.currency,s.expires_at,s.payment_provider,s.duration_months,
               b.name business_name,b.email business_email,p.name plan_name,
               ds.name site_name,ds.primary_host,ds.brand_config
        FROM tags_subscriptions s
        INNER JOIN tags_businesses b ON b.id=s.business_id
        INNER JOIN tags_plans p ON p.id=s.plan_id
        LEFT JOIN tags_directory_listings l ON l.business_id=b.id
        LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
        LEFT JOIN tags_directory_sites ds ON ds.id=sl.site_id
        WHERE s.status IN ('active','trial')
          AND s.expires_at IS NOT NULL
          AND DATEDIFF(s.expires_at,CURDATE()) BETWEEN 0 AND 7
          AND (s.last_expiration_notice_at IS NULL OR DATE(s.last_expiration_notice_at) < CURDATE())
        ORDER BY s.id
    `);
    let notified = 0;
    for (const row of rows) {
        const brand = directoryEmailBranding(row.site_name ? { name: row.site_name, primary_host: row.primary_host, brand_config: row.brand_config } : { name: "Tags", primary_host: "tags.com.ar", brand_config: null });
        const days = Math.max(0, Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86400000));
        const expiry = new Date(row.expires_at).toLocaleDateString("es-AR");
        const manual = row.payment_provider !== "mercadopago" ? `<p><strong>Datos para pagar:</strong><br>Titular: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_HOLDER)}<br>Alias: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_ALIAS)}<br>CBU/CVU: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_CBU)}<br>Cuenta: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_ACCOUNT)}</p>` : "";
        const subject = `Tu suscripción vence en ${days} ${days === 1 ? "día" : "días"} · ${brand.name}`;
        const text = `Tu plan ${row.plan_name} vence el ${expiry}. Faltan ${days} días. Importe: ARS ${Number(row.amount || 0).toLocaleString("es-AR")}.`;
        const html = `<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226;border:1px solid #dce9e1;border-radius:16px;overflow:hidden">${directoryEmailHeader(brand, "Aviso de vencimiento")}<main style="padding:24px"><p>Hola <strong>${escapeHtml(row.business_name)}</strong>,</p><p>Tu suscripción al plan <strong>${escapeHtml(row.plan_name)}</strong> vence el <strong>${expiry}</strong>. Faltan <strong>${days} días</strong>.</p><p><strong>Importe:</strong> ARS ${Number(row.amount || 0).toLocaleString("es-AR")}<br><strong>Duración:</strong> ${Number(row.duration_months || 1)} meses</p>${manual}</main></div>`;
        if (row.business_email) await sendMail({ to: row.business_email, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject, text, html });
        const [admins] = await db.query("SELECT email FROM tags_businesses WHERE role='admin' AND email IS NOT NULL");
        const recipients = [...new Set([brand.notificationEmail, ...admins.map(item => item.email)].filter(Boolean))];
        if (recipients.length) await sendMail({ to: recipients, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject: `${subject} · Plataforma`, text: `${row.business_name}: ${text}`, html });
        await db.query("UPDATE tags_subscriptions SET last_expiration_notice_at=NOW(),updated_at=NOW() WHERE id=?", [row.id]);
        notified += 1;
    }
    return notified;
}

export async function POST(req) {

    try {

        const authHeader =
            req.headers.get("authorization");

        if (
            process.env.SYSTEM_CRON_SECRET &&
            authHeader !== `Bearer ${process.env.SYSTEM_CRON_SECRET}`
        ) {
            return Response.json(
                {
                    error:
                        "Unauthorized"
                },
                {
                    status: 401
                }
            );
        }

        const [subscriptionsResult] =
            await db.query(
                `
                UPDATE
                    tags_subscriptions
                SET
                    status = 'expired',
                    updated_at = NOW()
                WHERE
                    status = 'active'
                    AND expires_at IS NOT NULL
                    AND DATE_ADD(
                        expires_at,
                        INTERVAL COALESCE(grace_days, 0) DAY
                    ) < NOW()
                    AND auto_disable_on_expire = 1
                    AND (
                        admin_override_until IS NULL
                        OR admin_override_until < NOW()
                    )
                `
            );

        const [addonsResult] =
            await db.query(
                `
                UPDATE
                    tags_business_addons
                SET
                    status = 'expired',
                    updated_at = NOW()
                WHERE
                    status = 'active'
                    AND expires_at IS NOT NULL
                    AND DATE_ADD(
                        expires_at,
                        INTERVAL COALESCE(grace_days, 0) DAY
                    ) < NOW()
                    AND auto_disable_on_expire = 1
                    AND (
                        admin_override_until IS NULL
                        OR admin_override_until < NOW()
                    )
                `
            );

        const [businessesResult] = await db.query(`
            UPDATE tags_businesses b
            INNER JOIN tags_subscriptions s ON s.business_id=b.id
            SET b.subscription_status='expired',b.updated_at=NOW()
            WHERE s.status='expired'
              AND s.id=(SELECT MAX(s2.id) FROM tags_subscriptions s2 WHERE s2.business_id=b.id)
              AND (b.plan_expires_at IS NULL OR b.plan_expires_at<NOW())
        `);

        const notificationsSent = await notifyUpcomingExpirations();
        return Response.json({
            ok: true,
            subscriptionsExpired:
                subscriptionsResult.affectedRows || 0,
            addonsExpired:
                addonsResult.affectedRows || 0,
            businessesExpired:
                businessesResult.affectedRows || 0,
            notificationsSent
        });

    } catch (err) {

        console.log(
            "SYSTEM SUBSCRIPTIONS SYNC ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error sincronizando vencimientos"
            },
            {
                status: 500
            }
        );
    }
}
