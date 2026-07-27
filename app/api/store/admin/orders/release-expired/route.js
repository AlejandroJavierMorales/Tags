// =====================================
// API: /api/store/admin/orders/release-expired
// Descripción: Libera reservas vencidas de Tags Tienda.
// Uso: Administración Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const body =
            await req.json();

        const {
            businessId
        } = body;

        if (!businessId) {
            return Response.json(
                {
                    error:
                        "businessId es requerido"
                },
                {
                    status: 400
                }
            );
        }

        const [storeRows] =
            await conn.query(
                `
                SELECT
                    id,
                    name
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'store'
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json(
                {
                    error:
                        "Tienda no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const [expiredOrders] =
            await conn.query(
                `
                SELECT
                    id,
                    order_number,
                    created_at
                FROM tags_store_orders
                WHERE store_id = ?
                AND stock_reserved = 1
                AND order_status = 'new'
                AND payment_status = 'pending'
                AND created_at <
                    DATE_SUB(
                        NOW(),
                        INTERVAL 72 HOUR
                    )
                `,
                [
                    store.id
                ]
            );

        if (!expiredOrders.length) {
            return Response.json({
                ok: true,
                released: 0,
                message:
                    "No hay reservas vencidas"
            });
        }

        await conn.beginTransaction();

        for (const order of expiredOrders) {

            await conn.query(
                `
                UPDATE tags_store_orders
                SET
                    stock_reserved = 0,
                    order_status = 'cancelled',
                    updated_at = NOW()
                WHERE id = ?
                `,
                [
                    order.id
                ]
            );

        }

        await conn.commit();

        return Response.json({
            ok: true,
            released:
                expiredOrders.length,
            orders:
                expiredOrders.map(
                    o => ({
                        id: o.id,
                        order_number:
                            o.order_number
                    })
                )
        });

    } catch (err) {

        await conn.rollback();

        console.error(
            "STORE RELEASE EXPIRED ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error liberando reservas vencidas"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }
}
