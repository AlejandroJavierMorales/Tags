// =====================================
// API: /api/system/subscriptions/sync
// Descripción: Sincroniza vencimientos de suscripciones y addons respetando excepciones admin.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

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

        return Response.json({
            ok: true,
            subscriptionsExpired:
                subscriptionsResult.affectedRows || 0,
            addonsExpired:
                addonsResult.affectedRows || 0
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