// =====================================
// API: /api/store/admin/inventory/list
// Descripción: Lista inventario editable de Tags Tienda.
// Uso: Gestión masiva de precios, stock y visibilidad.
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

        const categoryId =
            clean(searchParams.get("categoryId"));

        const page =
            Math.max(1, Number(searchParams.get("page") || 1));

        const limit =
            Number(
                searchParams.get("limit") || 40
            );

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
                AND app_type = 'store'
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
                items: [],
                categories: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0
                }
            });
        }

        const [categories] =
            await db.query(
                `
                SELECT
                    id,
                    name
                FROM tags_store_categories
                WHERE store_id = ?
                ORDER BY sort_order ASC, name ASC
                `,
                [store.id]
            );

        const baseSql =
            `
            SELECT *
            FROM (
                SELECT
                    'variant' AS item_type,
                    p.id AS product_id,
                    v.id AS variant_id,
                    p.category_id,
                    c.name AS category_name,
                    NULL AS image_url,
                    COALESCE(v.sku, p.sku, '') AS sku,
                    p.title AS product_title,
                    v.title AS variant_title,
                    v.price AS price,
                    v.sale_price AS sale_price,
                    v.stock_qty AS stock_qty,
                    v.is_visible AS is_visible,
                    p.status AS status
                FROM tags_store_variants v

                INNER JOIN tags_store_products p
                    ON p.id = v.product_id

                LEFT JOIN tags_store_categories c
                    ON c.id = p.category_id

                WHERE p.store_id = ?

                UNION ALL

                SELECT
                    'product' AS item_type,
                    p.id AS product_id,
                    NULL AS variant_id,
                    p.category_id,
                    c.name AS category_name,
                    NULL AS image_url,
                    COALESCE(p.sku, '') AS sku,
                    p.title AS product_title,
                    NULL AS variant_title,
                    p.price AS price,
                    p.sale_price AS sale_price,
                    p.stock_qty AS stock_qty,
                    p.is_visible AS is_visible,
                    p.status AS status
                FROM tags_store_products p

                LEFT JOIN tags_store_categories c
                    ON c.id = p.category_id

                WHERE p.store_id = ?
                AND NOT EXISTS (
                    SELECT 1
                    FROM tags_store_variants v2
                    WHERE v2.product_id = p.id
                )
            ) inventory_items
            `;

        const where =
            [];

        const params =
            [
                store.id,
                store.id
            ];

        if (q) {
            where.push(
                `
                (
                    sku LIKE ?
                    OR product_title LIKE ?
                    OR variant_title LIKE ?
                    OR category_name LIKE ?
                )
                `
            );

            const like =
                `%${q}%`;

            params.push(
                like,
                like,
                like,
                like
            );
        }

        if (categoryId) {
            where.push(
                "category_id = ?"
            );

            params.push(
                categoryId
            );
        }

        const whereSql =
            where.length
                ? `WHERE ${where.join(" AND ")}`
                : "";

        const [countRows] =
            await db.query(
                `
                SELECT COUNT(*) AS total
                FROM (${baseSql}) counted_items
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
                FROM (${baseSql}) paginated_items
                ${whereSql}
                ORDER BY
                    category_name ASC,
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

        return Response.json({
            ok: true,
            storeId: store.id,
            categories,
            items: items.map(item => ({
                ...item,
                price: Number(item.price || 0),
                sale_price:
                    item.sale_price === null
                        ? null
                        : Number(item.sale_price || 0),
                stock_qty: Number(item.stock_qty || 0),
                is_visible: Number(item.is_visible || 0)
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });

    } catch (err) {
        console.error(
            "STORE INVENTORY LIST ERROR:",
            err
        );

        return Response.json(
            { error: "Error listando inventario" },
            { status: 500 }
        );
    }
}
