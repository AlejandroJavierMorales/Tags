// =====================================
// API: /api/store/admin/variants/get
// Descripción: Obtiene opciones, valores y variantes de un producto.
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
                SELECT *
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

        const product =
            productRows[0];

        if (!product) {
            return Response.json(
                {
                    error: "Producto no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const [options] =
            await db.query(
                `
                SELECT *
                FROM tags_store_options
                WHERE product_id = ?
                ORDER BY sort_order ASC, id ASC
                `,
                [
                    productId
                ]
            );

        const [optionValues] =
            await db.query(
                `
                SELECT
                    v.*,
                    o.name AS option_name
                FROM tags_store_option_values v

                INNER JOIN tags_store_options o
                    ON o.id = v.option_id

                WHERE o.product_id = ?

                ORDER BY o.sort_order ASC, v.sort_order ASC, v.id ASC
                `,
                [
                    productId
                ]
            );

        const [variants] =
            await db.query(
                `
                SELECT *
                FROM tags_store_variants
                WHERE product_id = ?
                ORDER BY id ASC
                `,
                [
                    productId
                ]
            );

        const [variantValues] =
            await db.query(
                `
                SELECT
                    vv.*,
                    o.name AS option_name,
                    ov.value AS option_value
                FROM tags_store_variant_values vv

                INNER JOIN tags_store_options o
                    ON o.id = vv.option_id

                INNER JOIN tags_store_option_values ov
                    ON ov.id = vv.option_value_id

                WHERE o.product_id = ?

                ORDER BY vv.variant_id ASC, o.sort_order ASC
                `,
                [
                    productId
                ]
            );

        const normalizedVariants =
            variants.map(variant => ({
                ...variant,
                values:
                    variantValues.filter(v =>
                        Number(v.variant_id) === Number(variant.id)
                    )
            }));

        return Response.json({
            ok: true,
            storeId: store.id,
            product,
            options,
            optionValues,
            variants: normalizedVariants
        });

    } catch (err) {
        console.error(
            "STORE VARIANTS GET ERROR:",
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