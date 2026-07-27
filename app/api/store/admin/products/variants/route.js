// =====================================
// API: /api/store/admin/products/variants
// Descripción: Lista variantes resumidas de un producto para el listado.
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

        const productId =
            searchParams.get("productId");

        if (!businessId || !productId) {
            return Response.json(
                {
                    error: "businessId y productId son requeridos"
                },
                {
                    status: 400
                }
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
                [
                    businessId
                ]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json(
                {
                    error: "Tienda no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const [productRows] =
            await db.query(
                `
                SELECT id
                FROM tags_store_products
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
                `,
                [
                    productId,
                    store.id
                ]
            );

        if (!productRows.length) {
            return Response.json(
                {
                    error: "Producto no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const [variants] =
            await db.query(
                `
                SELECT
                    v.id,
                    v.sku,
                    v.title,
                    v.price,
                    v.sale_price,
                    v.stock_qty,
                    v.image_url,
                    v.is_visible,

                    GROUP_CONCAT(
                        CONCAT(o.name, ': ', ov.value)
                        ORDER BY o.sort_order ASC
                        SEPARATOR ' | '
                    ) AS options_label

                FROM tags_store_variants v

                LEFT JOIN tags_store_variant_values vv
                    ON vv.variant_id = v.id

                LEFT JOIN tags_store_options o
                    ON o.id = vv.option_id

                LEFT JOIN tags_store_option_values ov
                    ON ov.id = vv.option_value_id

                WHERE v.product_id = ?

                GROUP BY
                    v.id,
                    v.sku,
                    v.title,
                    v.price,
                    v.sale_price,
                    v.stock_qty,
                    v.image_url,
                    v.is_visible

                ORDER BY v.id ASC
                `,
                [
                    productId
                ]
            );

        return Response.json({
            ok: true,
            variants
        });

    } catch (err) {
        console.error(
            "STORE PRODUCT VARIANTS LIST ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error obteniendo variantes"
            },
            {
                status: 500
            }
        );
    }
}
