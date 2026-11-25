// =====================================
// API: /api/system/subscriptions/sync
// Descripción: Sincroniza vencimientos de suscripciones y addons respetando excepciones admin.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";
import { directoryEmailBranding, directoryEmailContact, directoryEmailHeader } from "@/app/modules/directory/lib/directoryEmailBranding";
import { reconcileMercadoPagoSubscription } from "@/app/modules/subscriptions/lib/subscriptionMercadoPagoReconciliation";

const escapeHtml = value => String(value || "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

async function notifyUpcomingExpirations() {
    const [rows] = await db.query(`
        SELECT s.id,s.business_id,s.status,s.amount,s.currency,s.expires_at,s.payment_provider,s.duration_months,s.grace_days,
               b.name business_name,b.email business_email,p.name plan_name,
               ds.name site_name,ds.primary_host,ds.brand_config
        FROM tags_subscriptions s
        INNER JOIN tags_businesses b ON b.id=s.business_id
        INNER JOIN tags_plans p ON p.id=s.plan_id
        LEFT JOIN tags_directory_listings l ON l.business_id=b.id
        LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
        LEFT JOIN tags_directory_sites ds ON ds.id=sl.site_id
        WHERE s.expires_at IS NOT NULL
          AND (
            (s.status IN ('active','trial') AND DATEDIFF(DATE(s.expires_at),CURDATE()) IN (3,0))
            OR
            (s.status='expired' AND DATEDIFF(CURDATE(),DATE(DATE_ADD(s.expires_at,INTERVAL COALESCE(s.grace_days,0) DAY)))>=1)
          )
        ORDER BY s.id
    `);
    let notified = 0;
    for (const row of rows) {
        const brand = directoryEmailBranding(row.site_name ? { name: row.site_name, primary_host: row.primary_host, brand_config: row.brand_config } : { name: "Tags", primary_host: "tags.com.ar", brand_config: null });
        const expiresAt = new Date(row.expires_at);
        const expiry = expiresAt.toLocaleDateString("es-AR");
        const today = new Date();
        const daysUntilExpiry = Math.round((Date.UTC(expiresAt.getFullYear(),expiresAt.getMonth(),expiresAt.getDate()) - Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())) / 86400000);
        const stage = row.status === "expired" ? "grace_ended" : daysUntilExpiry === 3 ? "three_days" : "expiry_day";
        const noticeKey = `subscription:${row.id}:expiration:${stage}:${expiresAt.toISOString().slice(0,10)}`;
        const [[alreadySent]] = await db.query("SELECT id FROM tags_subscription_audit_events WHERE idempotency_key=? LIMIT 1", [noticeKey]);
        if (alreadySent) continue;
        const amount = `${row.currency || "ARS"} ${Number(row.amount || 0).toLocaleString("es-AR")}`;
        const graceDays = Math.max(0, Number(row.grace_days || 0));
        const contact = directoryEmailContact(brand);
        const payment = row.payment_provider !== "mercadopago"
            ? `<section style="margin:22px 0;padding:18px;background:#f4f8f5;border-radius:12px"><strong>Datos para regularizar</strong><p style="line-height:1.65;margin:10px 0 0">Titular: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_HOLDER || "Consultar con la plataforma")}<br>Alias: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_ALIAS || "Consultar")}<br>CBU/CVU: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_CBU || "Consultar")}<br>Cuenta: ${escapeHtml(process.env.DIRECTORY_MANUAL_PAYMENT_ACCOUNT || "Consultar")}</p></section>`
            : `<section style="margin:22px 0;padding:18px;background:#f4f8f5;border-radius:12px"><strong>Cobro automático</strong><p style="line-height:1.6;margin:10px 0 0">La suscripción está asociada a Mercado Pago. Si el cobro ya fue realizado o necesitás revisar el medio de pago, comunicate con la plataforma.</p></section>`;
        const messages = {
            three_days: { heading: "Tu suscripción vence en 3 días", subject: `Tu suscripción vence en 3 días · ${brand.name}`, body: `Te recordamos que tu suscripción al plan <strong>${escapeHtml(row.plan_name)}</strong> vence el <strong>${expiry}</strong>.`, note: "Regularizá el pago antes del vencimiento para mantener activos tus servicios sin interrupciones." },
            expiry_day: { heading: "Tu suscripción vence hoy", subject: `Tu suscripción vence hoy · ${brand.name}`, body: `Hoy <strong>${expiry}</strong> vence tu suscripción al plan <strong>${escapeHtml(row.plan_name)}</strong>.`, note: graceDays > 0 ? `Disponés de ${graceDays} ${graceDays === 1 ? "día" : "días"} de gracia para regularizarla.` : "Para evitar la desactivación de los servicios asociados, regularizá el pago a la brevedad." },
            grace_ended: { heading: "Tu suscripción ya no está activa", subject: `Tu suscripción ya no está activa · ${brand.name}`, body: `Finalizó el período de vigencia y los ${graceDays} ${graceDays === 1 ? "día" : "días"} de gracia de tu plan <strong>${escapeHtml(row.plan_name)}</strong>.`, note: "Las páginas públicas y funcionalidades sujetas a esta suscripción quedaron desactivadas y ya no están visibles para el público. Comunicate con la plataforma para regularizarla y volver a activarlas." }
        };
        const message = messages[stage];
        const subject = message.subject;
        const text = `${message.heading}. ${String(message.body).replace(/<[^>]+>/g, "")} Plan: ${row.plan_name}. Importe: ${amount}. ${message.note} ${contact.text}`;
        const html = `<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226;border:1px solid #dce9e1;border-radius:16px;overflow:hidden">${directoryEmailHeader(brand, message.heading)}<main style="padding:24px"><p>Hola <strong>${escapeHtml(row.business_name)}</strong>,</p><p style="font-size:16px;line-height:1.65">${message.body}</p><section style="margin:22px 0;padding:18px;border:1px solid #dce9e1;border-radius:12px"><strong>Detalle de la suscripción</strong><p style="line-height:1.65;margin:10px 0 0"><strong>Plan:</strong> ${escapeHtml(row.plan_name)}<br><strong>Vencimiento:</strong> ${expiry}<br><strong>Importe:</strong> ${escapeHtml(amount)}</p></section><p style="font-size:16px;line-height:1.65"><strong>${message.note}</strong></p>${payment}${contact.html}</main></div>`;
        if (row.business_email) await sendMail({ to: row.business_email, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject, text, html });
        const [admins] = await db.query("SELECT email FROM tags_businesses WHERE role='admin' AND email IS NOT NULL");
        const recipients = [...new Set([brand.notificationEmail, ...admins.map(item => item.email)].filter(Boolean))];
        if (recipients.length) await sendMail({ to: recipients, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject: `${subject} · Plataforma`, text: `${row.business_name}: ${text}`, html });
        await db.query(`INSERT INTO tags_subscription_audit_events (subscription_id,business_id,event_code,actor_type,idempotency_key,next_state_json,context_json) VALUES (?,?,'subscription.expiration_notice','system',?,?,?) ON DUPLICATE KEY UPDATE id=id`, [row.id,row.business_id,noticeKey,JSON.stringify({stage,expiresAt:row.expires_at}),JSON.stringify({recipient:row.business_email || null,graceDays})]);
        await db.query("UPDATE tags_subscriptions SET last_expiration_notice_at=NOW(),updated_at=NOW() WHERE id=?", [row.id]);
        notified += 1;
    }
    return notified;
}

async function reconcileAutomaticPayments() {
    const [subscriptions] = await db.query(`SELECT id FROM tags_subscriptions WHERE payment_provider='mercadopago' AND external_subscription_id IS NOT NULL AND (provider_last_synced_at IS NULL OR provider_last_synced_at<DATE_SUB(NOW(),INTERVAL 6 HOUR)) ORDER BY COALESCE(provider_last_synced_at,'2000-01-01') LIMIT 50`);
    const results = [];
    for (const subscription of subscriptions) {
        try {
            results.push({ ok: true, ...(await reconcileMercadoPagoSubscription(subscription.id)) });
        } catch (error) {
            results.push({ subscriptionId: Number(subscription.id), ok: false, error: String(error?.message || error).slice(0, 300) });
        }
    }
    return results;
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

        const automaticPayments = await reconcileAutomaticPayments();

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
            notificationsSent,
            automaticPaymentsProcessed: automaticPayments.reduce((total, item) => total + Number(item.paymentsProcessed || 0), 0),
            automaticPaymentsFailed: automaticPayments.filter(item => !item.ok).length
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
