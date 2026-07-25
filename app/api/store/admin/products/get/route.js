// =====================================
// API: /api/store/admin/products/get
// Descripción:
// Obtiene un producto con imágenes y categorías.
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

function parseJson(
    value,
    fallback = {}
) {

    if (!value) {
        return fallback;
    }

    if (
        typeof value === "object"
    ) {
        return value;
    }

    try {

        return JSON.parse(
            value
        );

    } catch {

        return fallback;

    }

}

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

        /*
         * Se conserva compatibilidad con llamadas
         * existentes que envían id o productId.
         */
        const productId =
            searchParams.get(
                "productId"
            ) ||
            searchParams.get(
                "id"
            );

        if (
            !businessId ||
            !productId
        ) {

            return Response.json(
                {
                    error:
                        "businessId y productId son requeridos"
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

            return Response.json(
                {
                    error:
                        appType === "resto"
                            ? "Tags Resto no encontrado"
                            : "Tienda no encontrada"
                },
                {
                    status: 404
                }
            );

        }

        const [productRows] =
            await db.query(
                `
                SELECT
                    *
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
                    error:
                        "Producto no encontrado"
                },
                {
                    status: 404
                }
            );

        }

        product.settings_json =
            parseJson(
                product.settings_json,
                {}
            );

        const [images] =
            await db.query(
                `
                SELECT
                    *
                FROM tags_store_product_images
                WHERE product_id = ?
                ORDER BY
                    sort_order ASC,
                    id ASC
                `,
                [
                    product.id
                ]
            );

        const [categories] =
            await db.query(
                `
                SELECT
                    *
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
            product,
            images,
            categories
        });

    } catch (err) {

        console.error(
            "STORE PRODUCT GET ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error obteniendo producto"
            },
            {
                status: 500
            }
        );

    }

}