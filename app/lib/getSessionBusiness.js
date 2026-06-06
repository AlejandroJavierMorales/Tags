import { cookies }
    from "next/headers";

import { db }
    from "@/app/lib/tags-db";

export async function getSessionBusiness() {

    try {

        const cookieStore =
            await cookies();

        const cookie =
            cookieStore.get(
                "tags_session"
            );

        if (!cookie) {

            return null;
        }

        const parsed =
            JSON.parse(cookie.value);

        // =========================
        // ADMIN
        // =========================

        if (
            parsed?.role === "admin"
        ) {

            return {
                role: "admin",
                id: null,
                permissions: {
                    all: true
                }
            };
        }

        // =========================
        // BUSINESS
        // =========================

        const [rows] =
            await db.execute(
                `
                SELECT

                    b.id,
                    b.role,

                    p.dashboard_enabled,
                    p.reports_enabled,
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
                [
                    parsed.businessId
                ]
            );

        if (!rows.length) {

            return null;
        }

        const business =
            rows[0];

        return {

            role:
                business.role,

            id:
                business.id,

            permissions: {

                dashboard:
                    !!business.dashboard_enabled,

                reports:
                    !!business.reports_enabled,

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
        };

    } catch (err) {

        console.log(err);

        return null;
    }
}