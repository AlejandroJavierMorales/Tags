// =====================================
// API: /api/store/admin/products/list
// Descripción:
// Lista productos por businessId y appType,
// con búsqueda y filtros.
// Compatible con Tags Store y Tags Resto.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

const VALID_APP_TYPES = [
    "store",
    "resto"
];

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get(
                "businessId"
            );

        const appType =
            searchParams.get(
                "appType"
            ) || "store";

        const q =
            String(
                searchParams.get("q") || ""
            ).trim();

        const categoryId =
            searchParams.get(
                "categoryId"
            ) || "";

        const status =
            searchParams.get(
                "status"
            ) || "";

        const visible =
            searchParams.get(
                "visible"
            ) || "";

        const featured =
            searchParams.get(
                "featured"
            ) || "";

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

        if (
            !VALID_APP_TYPES.includes(
                appType
            )
        ) {

            return Response.json(
                {
                    error:
                        "appType inválido"
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
                    id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = ?
                LIMIT 1
                `,
                [
                    businessId,
                    appType
                ]
            );

        const store =
            storeRows[0];

        if (!store) {

            return Response.json({
                ok: true,
                appType,
                storeId: null,
                storeMissing: true,
                products: [],
                categories: []
            });

        }

        const where = [
            "p.store_id = ?"
        ];

        const params = [
            store.id
        ];

        if (q) {

            where.push(
                `
                (
                    p.title LIKE ?
                    OR p.sku LIKE ?
                    OR p.slug LIKE ?
                    OR p.description LIKE ?
                    OR c.name LIKE ?
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
                like
            );

        }

        if (categoryId) {

            where.push(
                "p.category_id = ?"
            );

            params.push(
                categoryId
            );

        }

        if (status) {

            where.push(
                "p.status = ?"
            );

            params.push(
                status
            );

        }

        if (visible !== "") {

            where.push(
                "p.is_visible = ?"
            );

            params.push(
                Number(visible) === 1
                    ? 1
                    : 0
            );

        }

        if (featured !== "") {

            where.push(
                "p.is_featured = ?"
            );

            params.push(
                Number(featured) === 1
                    ? 1
                    : 0
            );

        }

        const [products] =
            await db.query(
                `
                SELECT
                    p.*,
                    c.name AS category_name,
                    img.image_url AS primary_image_url,
                    COUNT(
                        DISTINCT v.id
                    ) AS variants_count

                FROM tags_store_products p

                LEFT JOIN tags_store_categories c
                    ON c.id = p.category_id
                    AND c.store_id = p.store_id

                LEFT JOIN tags_store_product_images img
                    ON img.product_id = p.id
                    AND img.is_primary = 1

                LEFT JOIN tags_store_variants v
                    ON v.product_id = p.id

                WHERE ${where.join(" AND ")}

                GROUP BY
                    p.id,
                    c.name,
                    img.image_url

                ORDER BY
                    p.created_at DESC
                `,
                params
            );

        const [categories] =
            await db.query(
                `
                SELECT
                    id,
                    name
                FROM tags_store_categories
                WHERE store_id = ?
                ORDER BY
                    sort_order ASC,
                    name ASC
                `,
                [
                    store.id
                ]
            );

        return Response.json({
            ok: true,
            appType,
            storeId: store.id,
            products,
            categories
        });

    } catch (err) {

        console.error(
            "STORE PRODUCTS LIST ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error listando productos"
            },
            {
                status: 500
            }
        );

    }

}