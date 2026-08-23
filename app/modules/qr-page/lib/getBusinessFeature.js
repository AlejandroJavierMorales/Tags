// =====================================
// LIB: getBusinessFeatures
// Descripción: Obtiene todas las capacidades activas de un cliente.
// =====================================

import { db }
    from "@/app/lib/tags-db";

export async function getBusinessFeatures(
    businessId
) {

    if (!businessId) {
        return null;
    }

    // =====================================
    // BUSINESS
    // =====================================

    const [businessRows] =
        await db.query(
            `
            SELECT
                *
            FROM
                tags_businesses
            WHERE
                id = ?
            LIMIT 1
            `,
            [businessId]
        );

    const business =
        businessRows[0];

    if (!business) {
        return null;
    }

    // =====================================
    // ACTIVE SUBSCRIPTION
    // =====================================

    const [subscriptionRows] =
        await db.query(
            `
            SELECT
                s.*,

                p.code AS plan_code,
                p.name AS plan_name,

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

            FROM
                tags_subscriptions s

            INNER JOIN
                tags_plans p
                    ON p.id = s.plan_id

            WHERE
                s.business_id = ?
                AND s.status = 'active'

            ORDER BY
                s.id DESC

            LIMIT 1
            `,
            [businessId]
        );

    const subscription =
        subscriptionRows[0] || null;

    // =====================================
    // QR COUNT
    // =====================================

    const [qrRows] =
        await db.query(
            `
            SELECT
                COUNT(*) AS total
            FROM
                tags_qr_codes
            WHERE
                business_id = ?
                AND is_active = 1
                AND status NOT IN ('deleted', 'disabled')
            `,
            [businessId]
        );

    const qrCount =
        Number(qrRows[0]?.total || 0);

    // =====================================
    // QR PAGE ADDONS
    // =====================================

    const [qrPageAddonRows] =
        await db.query(
            `
            SELECT
                COALESCE(
                    SUM(quantity),
                    0
                ) AS total
            FROM
                tags_business_addons
            WHERE
                business_id = ?
                AND addon_code = 'qr_page'
                AND status = 'active'
                AND (
                    expires_at IS NULL
                    OR expires_at >= NOW()
                )
            `,
            [businessId]
        );

    const qrPagesAllowed =
        Number(
            qrPageAddonRows[0]?.total || 0
        );

    // =====================================
    // QR PAGE USED
    // =====================================

    const [qrPageUsedRows] =
        await db.query(
            `
            SELECT
                COUNT(*) AS total
            FROM
                tags_qr_pages
            WHERE
                business_id = ?
                AND qr_code_id IS NOT NULL
            `,
            [businessId]
        );

    const qrPagesUsed =
        Number(
            qrPageUsedRows[0]?.total || 0
        );

    // =====================================
    // TAGSID
    // =====================================

    const [tagsIdRows] =
        await db.query(
            `
            SELECT
                id
            FROM
                tags_business_addons
            WHERE
                business_id = ?
                AND addon_code = 'tagsid'
                AND status = 'active'
            LIMIT 1
            `,
            [businessId]
        );

    const hasTagsId =
        tagsIdRows.length > 0;

    // =====================================
    // RETURN
    // =====================================

    return {

        business,

        subscription,

        plan: subscription
            ? {
                id: subscription.plan_id,

                code:
                    subscription.plan_code,

                name:
                    subscription.plan_name,

                maxQrCodes:
                    subscription.max_qr_codes,

                permissions: {

                    dashboard:
                        !!subscription.dashboard_enabled,

                    reports:
                        !!subscription.reports_enabled,

                    reportsEmail:
                        !!subscription.reports_email_enabled,

                    reportsWhatsapp:
                        !!subscription.reports_whatsapp_enabled,

                    analytics:
                        !!subscription.analytics_enabled,

                    analyticsPlus:
                        !!subscription.analytics_plus_enabled,

                    pauseQr:
                        !!subscription.allow_pause_qr,

                    editQr:
                        !!subscription.allow_edit_qr,

                    prioritySupport:
                        !!subscription.priority_support
                }
            }
            : null,

        qr: {

            used:
                qrCount,

            allowed:
                subscription?.max_qr_codes || 0,

            available:
                Math.max(
                    0,
                    (
                        subscription?.max_qr_codes || 0
                    ) - qrCount
                )
        },

        qrPages: {

            used:
                qrPagesUsed,

            allowed:
                qrPagesAllowed,

            available:
                Math.max(
                    0,
                    qrPagesAllowed - qrPagesUsed
                )
        },

        tagsId: {

            enabled:
                hasTagsId
        }
    };
}
