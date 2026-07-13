// =====================================
// API: /api/store/admin/product-reviews/list
// Descripción:
// Lista y filtra reseñas de productos de
// Commerce Reviews para el panel de Store.
// =====================================

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const businessId =
            Number(
                searchParams.get("businessId")
            );

        const q =
            String(
                searchParams.get("q") || ""
            ).trim();

        const status =
            String(
                searchParams.get("status") || ""
            ).trim();

        const isPublic =
            String(
                searchParams.get("isPublic") || ""
            ).trim();

        const verified =
            String(
                searchParams.get("verified") || ""
            ).trim();

        const rating =
            String(
                searchParams.get("rating") || ""
            ).trim();

        const productId =
            String(
                searchParams.get("productId") || ""
            ).trim();

        const page =
            Math.max(
                1,
                Number(
                    searchParams.get("page") || 1
                )
            );

        const limit =
            Math.min(
                100,
                Math.max(
                    1,
                    Number(
                        searchParams.get("limit") || 20
                    )
                )
            );

        const offset =
            (page - 1) * limit;

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

        const where = [
            "r.business_id = ?",
            "r.item_type = 'store_product'",
            "r.source_type = 'store_order'"
        ];

        const params = [
            businessId
        ];

        if (status) {

            where.push(
                "r.status = ?"
            );

            params.push(
                status
            );

        }

        if (isPublic === "public") {

            where.push(
                "r.is_public = 1"
            );

        }

        if (isPublic === "private") {

            where.push(
                "r.is_public = 0"
            );

        }

        if (verified === "verified") {

            where.push(
                "r.is_verified = 1"
            );

        }

        if (verified === "unverified") {

            where.push(
                "r.is_verified = 0"
            );

        }

        if (rating) {

            where.push(
                "r.rating = ?"
            );

            params.push(
                Number(rating)
            );

        }

        if (productId) {

            where.push(
                "r.item_id = ?"
            );

            params.push(
                Number(productId)
            );

        }

        if (q) {

            where.push(
                `
                (
                    r.customer_name LIKE ?
                    OR r.customer_email LIKE ?
                    OR r.title LIKE ?
                    OR r.comment LIKE ?
                    OR p.title LIKE ?
                    OR oi.title LIKE ?
                    OR oi.variant_title LIKE ?
                    OR o.order_number LIKE ?
                )
                `
            );

            const searchValue =
                `%${q}%`;

            params.push(
                searchValue,
                searchValue,
                searchValue,
                searchValue,
                searchValue,
                searchValue,
                searchValue,
                searchValue
            );

        }

        const whereSql =
            `WHERE ${where.join(" AND ")}`;

        const [[totalRow]] =
            await db.query(
                `
                SELECT
                    COUNT(DISTINCT r.id) AS total

                FROM tags_commerce_item_reviews r

                LEFT JOIN tags_store_products p
                    ON p.id = r.item_id

                LEFT JOIN tags_store_order_items oi
                    ON oi.id = r.source_item_id

                LEFT JOIN tags_store_orders o
                    ON o.id = r.source_id

                ${whereSql}
                `,
                params
            );

        const total =
            Number(
                totalRow?.total || 0
            );

        const [rows] =
            await db.query(
                `
                SELECT
                    r.id,
                    r.business_id,

                    r.source_type,
                    r.source_id,
                    r.source_item_id,

                    r.item_type,
                    r.item_id,

                    r.customer_name,
                    r.customer_email,

                    r.rating,
                    r.title,
                    r.comment,

                    r.status,
                    r.is_verified,
                    r.is_public,

                    r.created_at,
                    r.updated_at,

                    COALESCE(
                        p.title,
                        oi.title,
                        'Producto'
                    ) AS product_title,

                    oi.variant_id,
                    oi.variant_title,

                    o.id AS order_id,
                    o.order_number

                FROM tags_commerce_item_reviews r

                LEFT JOIN tags_store_products p
                    ON p.id = r.item_id

                LEFT JOIN tags_store_order_items oi
                    ON oi.id = r.source_item_id

                LEFT JOIN tags_store_orders o
                    ON o.id = r.source_id

                ${whereSql}

                ORDER BY
                    r.created_at DESC,
                    r.id DESC

                LIMIT ${limit}
                OFFSET ${offset}
                `,
                params
            );

        return Response.json({
            ok: true,
            data:
                rows,
            total,
            page,
            pages:
                Math.ceil(
                    total / limit
                )
        });

    } catch (err) {

        console.error(
            "STORE PRODUCT REVIEWS LIST ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error listando reseñas de productos"
            },
            {
                status: 500
            }
        );

    }

}