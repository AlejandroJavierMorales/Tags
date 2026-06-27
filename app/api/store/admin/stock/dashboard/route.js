// =====================================
// API: /api/store/admin/stock/dashboard
// Descripción: Dashboard paginado de stock real, retenido y disponible de Tags Tienda.
// Uso: Admin Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function clean(value) {
    return String(value || "").trim();
}

function normalizeStatus(value) {
    const cleanValue =
        clean(value);

    const allowed = [
        "ok",
        "low_stock",
        "no_stock"
    ];

    return allowed.includes(cleanValue)
        ? cleanValue
        : "";
}

function parseSettings(value) {
    if (!value) {
        return {};
    }

    if (typeof value === "object") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
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
            normalizeStatus(
                searchParams.get("status")
            );

        const page =
            Math.max(
                1,
                Number(searchParams.get("page") || 1)
            );

        const limit =
            Math.min(
                40,
                Math.max(
                    10,
                    Number(searchParams.get("limit") || 40)
                )
            );

        const offset =
            (page - 1) * limit;

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
            await db.query(
                `
                SELECT
                    id,
                    settings_json
                FROM tags_stores
                WHERE business_id = ?
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json({
                ok: true,
                storeMissing: true,
                lowThreshold: 3,
                stats: {
                    totalItems: 0,
                    totalStock: 0,
                    totalReserved: 0,
                    totalAvailable: 0,
                    lowStock: 0,
                    noStock: 0
                },
                items: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0
                }
            });
        }

        const storeSettings =
            parseSettings(
                store.settings_json
            );

        const lowThreshold =
            Math.max(
                0,
                Number(
                    searchParams.get("lowThreshold") ||
                    storeSettings.minStockAlert ||
                    3
                )
            );

        const baseSql =
            `
            SELECT *
            FROM (
                SELECT
                    'variant' AS item_type,
                    p.id AS product_id,
                    v.id AS variant_id,
                    COALESCE(v.sku, p.sku, '') AS sku,
                    p.title AS product_title,
                    v.title AS variant_title,
                    v.stock_qty AS stock_qty,
                    COALESCE(r.reserved_qty, 0) AS reserved_qty,
                    (v.stock_qty - COALESCE(r.reserved_qty, 0)) AS available_qty,
                    CASE
                        WHEN (v.stock_qty - COALESCE(r.reserved_qty, 0)) <= 0
                            THEN 'no_stock'
                        WHEN (v.stock_qty - COALESCE(r.reserved_qty, 0)) <= ?
                            THEN 'low_stock'
                        ELSE 'ok'
                    END AS stock_status,
                    p.is_visible,
                    p.status
                FROM tags_store_variants v

                INNER JOIN tags_store_products p
                    ON p.id = v.product_id

                LEFT JOIN (
                    SELECT
                        oi.variant_id,
                        SUM(oi.quantity) AS reserved_qty
                    FROM tags_store_order_items oi

                    INNER JOIN tags_store_orders o
                        ON o.id = oi.order_id

                    WHERE o.store_id = ?
                    AND o.stock_reserved = 1
                    AND o.order_status = 'new'
                    AND o.payment_status = 'pending'
                    AND oi.variant_id IS NOT NULL

                    GROUP BY oi.variant_id
                ) r
                    ON r.variant_id = v.id

                WHERE p.store_id = ?
                AND v.is_visible = 1

                UNION ALL

                SELECT
                    'product' AS item_type,
                    p.id AS product_id,
                    NULL AS variant_id,
                    COALESCE(p.sku, '') AS sku,
                    p.title AS product_title,
                    NULL AS variant_title,
                    p.stock_qty AS stock_qty,
                    COALESCE(r.reserved_qty, 0) AS reserved_qty,
                    (p.stock_qty - COALESCE(r.reserved_qty, 0)) AS available_qty,
                    CASE
                        WHEN (p.stock_qty - COALESCE(r.reserved_qty, 0)) <= 0
                            THEN 'no_stock'
                        WHEN (p.stock_qty - COALESCE(r.reserved_qty, 0)) <= ?
                            THEN 'low_stock'
                        ELSE 'ok'
                    END AS stock_status,
                    p.is_visible,
                    p.status
                FROM tags_store_products p

                LEFT JOIN (
                    SELECT
                        oi.product_id,
                        SUM(oi.quantity) AS reserved_qty
                    FROM tags_store_order_items oi

                    INNER JOIN tags_store_orders o
                        ON o.id = oi.order_id

                    WHERE o.store_id = ?
                    AND o.stock_reserved = 1
                    AND o.order_status = 'new'
                    AND o.payment_status = 'pending'
                    AND oi.variant_id IS NULL

                    GROUP BY oi.product_id
                ) r
                    ON r.product_id = p.id

                WHERE p.store_id = ?
                AND p.stock_enabled = 1
                AND NOT EXISTS (
                    SELECT 1
                    FROM tags_store_variants v2
                    WHERE v2.product_id = p.id
                )
            ) stock_items
            `;

        const baseParams = [
            lowThreshold,
            store.id,
            store.id,
            lowThreshold,
            store.id,
            store.id
        ];

        const where = [];

        const params = [
            ...baseParams
        ];

        if (q) {
            where.push(
                `
                (
                    sku LIKE ?
                    OR product_title LIKE ?
                    OR variant_title LIKE ?
                )
                `
            );

            const like =
                `%${q}%`;

            params.push(
                like,
                like,
                like
            );
        }

        if (status) {
            where.push(
                "stock_status = ?"
            );

            params.push(
                status
            );
        }

        const whereSql =
            where.length
                ? `WHERE ${where.join(" AND ")}`
                : "";

        const [statsRows] =
            await db.query(
                `
                SELECT
                    COUNT(*) AS totalItems,
                    COALESCE(SUM(stock_qty), 0) AS totalStock,
                    COALESCE(SUM(reserved_qty), 0) AS totalReserved,
                    COALESCE(SUM(available_qty), 0) AS totalAvailable,
                    SUM(
                        CASE
                            WHEN stock_status = 'low_stock'
                            THEN 1
                            ELSE 0
                        END
                    ) AS lowStock,
                    SUM(
                        CASE
                            WHEN stock_status = 'no_stock'
                            THEN 1
                            ELSE 0
                        END
                    ) AS noStock
                FROM (${baseSql}) all_stock_items
                `,
                baseParams
            );

        const statsRow =
            statsRows[0] || {};

        const stats = {
            totalItems:
                Number(statsRow.totalItems || 0),
            totalStock:
                Number(statsRow.totalStock || 0),
            totalReserved:
                Number(statsRow.totalReserved || 0),
            totalAvailable:
                Number(statsRow.totalAvailable || 0),
            lowStock:
                Number(statsRow.lowStock || 0),
            noStock:
                Number(statsRow.noStock || 0)
        };

        const [countRows] =
            await db.query(
                `
                SELECT
                    COUNT(*) AS total
                FROM (${baseSql}) filtered_stock_items
                ${whereSql}
                `,
                params
            );

        const total =
            Number(countRows[0]?.total || 0);

        const totalPages =
            Math.ceil(total / limit);

        const [items] =
            await db.query(
                `
                SELECT *
                FROM (${baseSql}) paginated_stock_items
                ${whereSql}
                ORDER BY
                    available_qty ASC,
                    product_title ASC,
                    variant_title ASC
                LIMIT ?
                OFFSET ?
                `,
                [
                    ...params,
                    limit,
                    offset
                ]
            );

        const normalizedItems =
            items.map(item => ({
                ...item,
                stock_qty:
                    Number(item.stock_qty || 0),
                reserved_qty:
                    Number(item.reserved_qty || 0),
                available_qty:
                    Number(item.available_qty || 0)
            }));

        return Response.json({
            ok: true,
            storeId:
                store.id,
            lowThreshold,
            stats,
            items:
                normalizedItems,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });

    } catch (err) {
        console.error(
            "STORE STOCK DASHBOARD ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error obteniendo dashboard de stock"
            },
            {
                status: 500
            }
        );
    }
}