export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    const expected =
        process.env.SYSTEM_CRON_SECRET ||
        "";

    const received =
        (
            req.headers.get(
                "authorization"
            ) ||
            req.headers.get(
                "x-cron-secret"
            ) ||
            ""
        )
            .replace(/^Bearer\s+/i, "")
            .trim();

    if (
        !expected ||
        received !== expected
    ) {
        return Response.json(
            { error: "No autorizado" },
            { status: 401 }
        );
    }

    const conn =
        await db.getConnection();

    try {
        await conn.beginTransaction();

        const [orders] =
            await conn.query(
                `
                SELECT
                    id,
                    store_id,
                    coupon_id
                FROM tags_store_orders
                WHERE stock_reserved = 1
                AND order_status = 'new'
                AND payment_status = 'pending'
                AND (
                    (
                        payment_method =
                            'mercado_pago'
                        AND created_at <
                            DATE_SUB(
                                NOW(),
                                INTERVAL 2 HOUR
                            )
                    )
                    OR
                    (
                        payment_method !=
                            'mercado_pago'
                        AND created_at <
                            DATE_SUB(
                                NOW(),
                                INTERVAL 72 HOUR
                            )
                    )
                )
                FOR UPDATE
                `
            );

        for (const order of orders) {
            await conn.query(
                `
                UPDATE tags_store_orders
                SET
                    stock_reserved = 0,
                    order_status =
                        'cancelled',
                    updated_at = NOW()
                WHERE id = ?
                AND stock_reserved = 1
                `,
                [order.id]
            );

            if (order.coupon_id) {
                await conn.query(
                    `
                    UPDATE tags_store_coupons
                    SET
                        used_count =
                            GREATEST(
                                0,
                                used_count - 1
                            ),
                        updated_at = NOW()
                    WHERE id = ?
                    AND store_id = ?
                    `,
                    [
                        order.coupon_id,
                        order.store_id
                    ]
                );
            }
        }

        await conn.commit();

        return Response.json({
            ok: true,
            released: orders.length
        });
    } catch (error) {
        await conn.rollback();

        console.error(
            "STORE CRON RELEASE EXPIRED ERROR:",
            error
        );

        return Response.json(
            {
                error:
                    "No se pudieron liberar las reservas vencidas"
            },
            { status: 500 }
        );
    } finally {
        conn.release();
    }
}
