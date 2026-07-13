// =====================================
// API: /api/business/subscription-summary
// Descripción: Devuelve resumen visible para el cliente sobre plan, suscripción, último pago, uso y features.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const id =
            searchParams.get("id");

        if (!id) {
            return Response.json(
                { error: "id requerido" },
                { status: 400 }
            );
        }

        const [businessRows] =
            await db.query(
                `
                SELECT
                    b.id,
                    b.name,
                    b.email,
                    b.phone,
                    b.subscription_status,
                    b.plan_started_at,
                    b.plan_expires_at,

                    p.id AS plan_id,
                    p.code AS plan_code,
                    p.name AS plan_name,
                    p.description AS plan_description,
                    p.price AS plan_price,
                    p.currency AS plan_currency,
                    p.max_qr_codes,

                    p.dashboard_enabled,
                    p.reports_enabled,
                    p.reports_email_enabled,
                    p.reports_whatsapp_enabled,
                    p.analytics_enabled,
                    p.analytics_plus_enabled,
                    p.allow_pause_qr,
                    p.allow_edit_qr,
                    p.priority_support

                FROM tags_businesses b

                LEFT JOIN tags_plans p
                    ON p.id = b.plan_id

                WHERE b.id = ?
                LIMIT 1
                `,
                [id]
            );

        const business =
            businessRows[0];

        if (!business) {
            return Response.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        const [subscriptionRows] =
            await db.query(
                `
                SELECT *
                FROM tags_subscriptions
                WHERE business_id = ?
                AND status IN ('active', 'trial', 'past_due')
                ORDER BY id DESC
                LIMIT 1
                `,
                [id]
            );

        const subscription =
            subscriptionRows[0] || null;

        const [paymentRows] =
            await db.query(
                `
                SELECT *
                FROM tags_subscription_payments
                WHERE business_id = ?
                AND status = 'approved'
                ORDER BY paid_at DESC, id DESC
                LIMIT 1
                `,
                [id]
            );

        const lastPayment =
            paymentRows[0] || null;

        const [qrUsageRows] =
            await db.query(
                `
                SELECT COUNT(*) AS total_qrs
                FROM tags_qr_codes
                WHERE business_id = ?
                `,
                [id]
            );

        const [pageUsageRows] =
            await db.query(
                `
                SELECT
                    SUM(CASE WHEN page_type = 'qr_page' THEN 1 ELSE 0 END) AS qr_pages_used,
                    SUM(CASE WHEN page_type = 'tags_id' THEN 1 ELSE 0 END) AS tags_id_used,
                    SUM(CASE WHEN page_type = 'client_reviews' THEN 1 ELSE 0 END) AS reviews_used
                FROM tags_qr_pages
                WHERE business_id = ?
                `,
                [id]
            );

        const [storeUsageRows] =
            await db.query(
                `
                SELECT COUNT(*) AS store_used
                FROM tags_stores
                WHERE business_id = ?
                `,
                [id]
            );

        const [portalUsageRows] =
            await db.query(
                `
                SELECT COUNT(*) AS portal_public_used
                FROM tags_portals
                WHERE business_id = ?
                `,
                [id]
            );

        const [addonRows] =
            await db.query(
                `
                SELECT
                    addon_code,
                    quantity,
                    status,
                    expires_at
                FROM tags_business_addons
                WHERE business_id = ?
                AND status = 'active'
                AND (
                    expires_at IS NULL
                    OR expires_at >= NOW()
                )
                `,
                [id]
            );

        const getAddonTotal = (code) => {
            const addon =
                addonRows.find(
                    row => row.addon_code === code
                );

            return addon
                ? Number(addon.quantity || 1)
                : 0;
        };

        const qrsUsed =
            Number(qrUsageRows[0]?.total_qrs || 0);

        const qrPagesUsed =
            Number(pageUsageRows[0]?.qr_pages_used || 0);

        const tagsIdUsed =
            Number(pageUsageRows[0]?.tags_id_used || 0);

        const reviewsUsed =
            Number(pageUsageRows[0]?.reviews_used || 0);

        const storeUsed =
            Number(storeUsageRows[0]?.store_used || 0);

        const portalPublicUsed =
            Number(portalUsageRows[0]?.portal_public_used || 0);

        return Response.json({
            ok: true,

            business: {
                id: business.id,
                name: business.name,
                email: business.email,
                phone: business.phone
            },

            plan: {
                id: business.plan_id,
                code: business.plan_code,
                name: business.plan_name,
                description: business.plan_description,
                price: business.plan_price,
                currency: business.plan_currency
            },

            subscription: {
                status:
                    subscription?.status ||
                    business.subscription_status,
                started_at:
                    subscription?.started_at ||
                    business.plan_started_at,
                expires_at:
                    subscription?.expires_at ||
                    business.plan_expires_at,
                auto_renew:
                    subscription?.auto_renew || 0,
                grace_days:
                    subscription?.grace_days || 0
            },

            lastPayment: lastPayment
                ? {
                    amount: lastPayment.amount,
                    currency: lastPayment.currency,
                    provider: lastPayment.provider,
                    paid_at: lastPayment.paid_at,
                    period_start: lastPayment.period_start,
                    period_end: lastPayment.period_end
                }
                : null,

            usage: {
                qrs_used: qrsUsed,
                qrs_total: Number(business.max_qr_codes || 0),

                qr_pages_used: qrPagesUsed,
                qr_pages_total: getAddonTotal("qr_page"),

                tags_id_used: tagsIdUsed,
                tags_id_total: getAddonTotal("tagsid"),

                reviews_used: reviewsUsed,
                reviews_total: getAddonTotal("client_reviews"),

                store_used: storeUsed,
                store_total: getAddonTotal("store"),

                portal_public_used: portalPublicUsed,
                portal_public_total: getAddonTotal("portal_public"),

                restaurant_used: 0,
                restaurant_total: getAddonTotal("restaurant"),

                booking_used: 0,
                booking_total: getAddonTotal("booking")
            },

            addons: addonRows,

            features: {
                dashboard_enabled:
                    !!business.dashboard_enabled,

                reports_enabled:
                    !!business.reports_enabled,

                reports_email_enabled:
                    !!business.reports_email_enabled,

                reports_whatsapp_enabled:
                    !!business.reports_whatsapp_enabled,

                analytics_enabled:
                    !!business.analytics_enabled,

                analytics_plus_enabled:
                    !!business.analytics_plus_enabled,

                allow_pause_qr:
                    !!business.allow_pause_qr,

                allow_edit_qr:
                    !!business.allow_edit_qr,

                priority_support:
                    !!business.priority_support
            }
        });

    } catch (err) {
        console.error(
            "BUSINESS SUBSCRIPTION SUMMARY ERROR:",
            err
        );

        return Response.json(
            { error: "Error obteniendo resumen de suscripción" },
            { status: 500 }
        );
    }
}