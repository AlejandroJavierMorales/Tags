// =====================================
// API: /api/store/admin/orders/expired-reservations
// Descripción: Obtiene resumen de reservas vencidas y productos comprometidos.
// Uso: Dashboard Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        if (!businessId) {
            return Response.json(
                {
                    error:
                        "businessId requerido"
                },
                {
                    status: 400
                }
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT
                    id,
                    settings_json
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'store'
                LIMIT 1
                `,
                [businessId]
            );

        const store =
            storeRows[0];

        const settings =
            typeof store.settings_json === "string"
                ? JSON.parse(store.settings_json || "{}")
                : store.settings_json || {};

        const stockHoldHours =
            Number(settings.stockHoldHours || 72);

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
            await db.query(
                `
                SELECT
                    id,
                    order_number,
                    customer_name,
                    created_at
                FROM tags_store_orders
                WHERE store_id = ?
                AND stock_reserved = 1
                AND order_status = 'new'
                AND payment_status = 'pending'
                AND created_at <
                    DATE_SUB(
                        NOW(),
                        INTERVAL ? HOUR
                    )
                ORDER BY created_at ASC
                `,
                [
                    store.id,
                    stockHoldHours
                ]
            );

        const [products] =
            await db.query(
                `
                SELECT
                    COALESCE(
                        oi.sku,
                        p.sku
                    ) AS sku,

                    oi.title,

                    SUM(
                        oi.quantity
                    ) AS quantity

                FROM tags_store_order_items oi

                INNER JOIN tags_store_orders o
                    ON o.id = oi.order_id

                LEFT JOIN tags_store_products p
                    ON p.id = oi.product_id

                WHERE o.store_id = ?
                AND o.stock_reserved = 1
                AND o.order_status = 'new'
                AND o.payment_status = 'pending'
                AND o.created_at <
                    DATE_SUB(
                        NOW(),
                        INTERVAL ? HOUR
                    )

                GROUP BY
                    sku,
                    oi.title

                ORDER BY
                    quantity DESC
                `,
                [
                    store.id,
                    stockHoldHours
                ]
            );

        const totalUnits =
            products.reduce(
                (
                    acc,
                    item
                ) =>
                    acc +
                    Number(
                        item.quantity || 0
                    ),
                0
            );

        return Response.json({
            ok: true,
            totalOrders:
                expiredOrders.length,
            totalUnits,
            expiredOrders,
            products
        });

    } catch (err) {

        console.error(
            "STORE EXPIRED RESERVATIONS ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error obteniendo reservas vencidas"
            },
            {
                status: 500
            }
        );
    }
}
