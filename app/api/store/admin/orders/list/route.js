// =====================================
// API: /api/store/admin/orders/list
// Descripción: Lista pedidos de Tags Tienda con búsqueda, filtros, paginación y KPIs globales.
// Uso: Dashboard Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function clean(value) {
    return String(value || "").trim();
}

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        const q =
            clean(searchParams.get("q"));

        const status =
            clean(searchParams.get("status"));

        const payment =
            clean(searchParams.get("payment"));

        const shipping =
            clean(searchParams.get("shipping"));

        const page =
            Math.max(1, Number(searchParams.get("page") || 1));

        const limit =
            Math.min(50, Math.max(10, Number(searchParams.get("limit") || 20)));

        const offset =
            (page - 1) * limit;

        if (!businessId) {
            return Response.json(
                { error: "businessId es requerido" },
                { status: 400 }
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT id
                FROM tags_stores
                WHERE business_id = ?
                LIMIT 1
                `,
                [businessId]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json({
                ok: true,
                storeMissing: true,
                orders: [],
                stats: {
                    total_orders: 0,
                    pending_payments: 0,
                    paid_orders: 0,
                    shipped_orders: 0,
                    delivered_orders: 0,
                    cancelled_orders: 0,
                    total_revenue: 0
                },
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0
                }
            });
        }

        const where =
            ["o.store_id = ?"];

        const params =
            [store.id];

        if (status) {
            where.push("o.order_status = ?");
            params.push(status);
        }

        if (payment) {
            where.push("o.payment_status = ?");
            params.push(payment);
        }

        if (shipping) {
            where.push("o.shipping_status = ?");
            params.push(shipping);
        }

        if (q) {
            where.push(
                `
                (
                    o.order_number LIKE ?
                    OR o.customer_name LIKE ?
                    OR o.customer_email LIKE ?
                    OR o.customer_phone LIKE ?
                    OR o.shipping_method_name LIKE ?
                    OR o.carrier_name LIKE ?
                    OR EXISTS (
                        SELECT 1
                        FROM tags_store_order_items si
                        WHERE si.order_id = o.id
                        AND (
                            si.title LIKE ?
                            OR si.variant_title LIKE ?
                            OR si.sku LIKE ?
                        )
                    )
                )
                `
            );

            const like =
                `%${q}%`;

            params.push(
                like,
                like,
                like,
                like,
                like,
                like,
                like,
                like,
                like
            );
        }

        const whereSql =
            where.join(" AND ");

        const [countRows] =
            await db.query(
                `
                SELECT COUNT(*) AS total
                FROM tags_store_orders o
                WHERE ${whereSql}
                `,
                params
            );

        const total =
            Number(countRows[0]?.total || 0);

        const totalPages =
            Math.ceil(total / limit);

        const [statsRows] =
            await db.query(
                `
                SELECT
                    COUNT(*) AS total_orders,

                    SUM(o.order_status = 'new') AS new_orders,
                    SUM(o.order_status = 'confirmed') AS confirmed_orders,
                    SUM(o.order_status = 'completed') AS completed_orders,
                    SUM(o.order_status = 'cancelled' OR o.shipping_status = 'cancelled') AS cancelled_orders,

                    SUM(o.payment_status = 'pending') AS pending_payments,
                    SUM(o.payment_status = 'paid') AS paid_orders,

                    SUM(o.shipping_status = 'pending') AS pending_shipping,
                    SUM(o.shipping_status = 'ready') AS ready_shipping,
                    SUM(o.shipping_status IN ('shipped', 'in_transit')) AS in_transit_shipping,
                    SUM(o.shipping_status = 'delivered') AS delivered_shipping,

                    SUM(
                        CASE
                            WHEN o.order_status <> 'cancelled'
                            AND COALESCE(o.shipping_status, '') <> 'cancelled'
                            THEN o.total
                            ELSE 0
                        END
                    ) AS total_revenue
                FROM tags_store_orders o
                WHERE ${whereSql}
                `,
                params
            );

        const rawStats =
            statsRows[0] || {};

        const stats = {
            total_orders:
                Number(rawStats.total_orders || 0),
            new_orders:
                Number(rawStats.new_orders || 0),
            confirmed_orders:
                Number(rawStats.confirmed_orders || 0),
            completed_orders:
                Number(rawStats.completed_orders || 0),
            cancelled_orders:
                Number(rawStats.cancelled_orders || 0),
            pending_payments:
                Number(rawStats.pending_payments || 0),
            paid_orders:
                Number(rawStats.paid_orders || 0),
            pending_shipping:
                Number(rawStats.pending_shipping || 0),
            ready_shipping:
                Number(rawStats.ready_shipping || 0),
            in_transit_shipping:
                Number(rawStats.in_transit_shipping || 0),
            delivered_shipping:
                Number(rawStats.delivered_shipping || 0),
            total_revenue:
                Number(rawStats.total_revenue || 0)
        };

        const [orders] =
            await db.query(
                `
                SELECT
                    o.*,
                    COUNT(i.id) AS items_count,
                    GROUP_CONCAT(
                        DISTINCT i.title
                        ORDER BY i.title
                        SEPARATOR ', '
                    ) AS products_text,
                    GROUP_CONCAT(
                        DISTINCT i.variant_title
                        ORDER BY i.variant_title
                        SEPARATOR ', '
                    ) AS variants_text,
                    GROUP_CONCAT(
                        DISTINCT i.sku
                        ORDER BY i.sku
                        SEPARATOR ', '
                    ) AS skus_text
                FROM tags_store_orders o
                LEFT JOIN tags_store_order_items i
                    ON i.order_id = o.id
                WHERE ${whereSql}
                GROUP BY o.id
                ORDER BY o.created_at DESC
                LIMIT ?
                OFFSET ?
                `,
                [
                    ...params,
                    limit,
                    offset
                ]
            );

        return Response.json({
            ok: true,
            storeId: store.id,
            orders,
            stats,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });

    } catch (err) {
        console.error("STORE ORDERS LIST ERROR:", err);

        return Response.json(
            { error: "Error listando pedidos" },
            { status: 500 }
        );
    }
}