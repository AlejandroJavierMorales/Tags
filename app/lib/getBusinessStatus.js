import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function getBusinessStatus(
    requestedBusinessId
) {

    // =========================
    // 🍪 SESSION
    // =========================

    const cookie =
        cookies().get("tags_session");

    if (!cookie) {
        return null;
    }

    let session;

    try {

        session =
            JSON.parse(cookie.value);

    } catch {

        return null;
    }

    // =========================
    // 🔒 VALIDAR OWNER
    // =========================

    const loggedBusinessId =
        Number(session.businessId);

    const requestedId =
        Number(requestedBusinessId);

    const isOwner =
        loggedBusinessId === requestedId;

    if (!isOwner) {
        return {
            forbidden: true
        };
    }

    // =========================
    // 🔍 BUSINESS + PLAN
    // =========================

    const [rows] = await db.execute(`
        SELECT
            b.id,
            b.name,
            b.email,
            b.phone,

            b.subscription_status,
            b.plan_started_at,
            b.plan_expires_at,

            p.id AS plan_id,
            p.code,
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

        FROM tags_businesses b

        LEFT JOIN tags_plans p
            ON p.id = b.plan_id

        WHERE b.id = ?
        LIMIT 1
    `, [requestedId]);

    const business = rows[0];

    if (!business) {
        return null;
    }

    // =========================
    // 🚫 BLOQUEADO
    // =========================

    if (
        business.subscription_status !== "active" &&
        business.subscription_status !== "trial" &&
        !(business.subscription_status === "inactive" && ["directory_web", "directory_web_plus"].includes(business.code))
    ) {
        return {
            blocked: true
        };
    }

    // =========================
    // ✅ STATUS
    // =========================

    return {

        forbidden: false,
        blocked: false,

        businessId: business.id,

        name: business.name,
        email: business.email,
        phone: business.phone,

        subscriptionStatus:
            business.subscription_status,

        plan: {

            id: business.plan_id,

            code: business.code,

            name: business.plan_name,

            permissions: {

                dashboard:
                    !!business.dashboard_enabled,

                reports:
                    !!business.reports_enabled,

                reportsEmail:
                    !!business.reports_email_enabled,

                reportsWhatsapp:
                    !!business.reports_whatsapp_enabled,

                analytics:
                    !!business.analytics_enabled,

                analyticsPlus:
                    !!business.analytics_plus_enabled,

                pauseQr:
                    !!business.allow_pause_qr,

                editQr:
                    !!business.allow_edit_qr,

                prioritySupport:
                    !!business.priority_support
            }
        }
    };
}
