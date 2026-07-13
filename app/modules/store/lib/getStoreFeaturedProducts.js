// =====================================
// Archivo:
// /app/modules/store/lib/getStoreFeaturedProducts.js
//
// Descripción:
// Obtiene colecciones públicas de productos
// de una tienda para bloques destacados,
// ofertas, novedades, categoría o relacionados.
//
// Contexto:
// store
// =====================================

import { db }
    from "@/app/lib/tags-db";

export async function getStoreFeaturedProducts(
    storeId,
    limitOrOptions = 8
) {

    if (!storeId) {
        return [];
    }

    const options =
        typeof limitOrOptions === "object" && limitOrOptions !== null
            ? limitOrOptions
            : {
                limit: limitOrOptions
            };

    const limit =
        options.limit || 8;

    const mode =
        options.mode || "featured";

    const categoryId =
        options.categoryId || null;

    const productId =
        options.productId || null;

    const safeLimit =
        Math.max(
            1,
            Math.min(
                Number(limit) || 8,
                20
            )
        );

    let whereExtra =
        "";

    const params =
        [
            storeId
        ];

    if (mode === "featured") {
        whereExtra =
            "AND p.is_featured = 1";
    }

    if (mode === "sale") {
        whereExtra =
            "AND p.is_offer = 1";
    }

    if (mode === "recent") {
        whereExtra =
            "AND p.is_new = 1";
    }

    if (mode === "category" && categoryId) {
        whereExtra =
            "AND p.category_id = ?";

        params.push(categoryId);
    }

    if (mode === "related" && productId) {

        const [currentRows] =
            await db.execute(
                `
            SELECT category_id
            FROM tags_store_products
            WHERE id = ?
            AND store_id = ?
            LIMIT 1
            `,
                [
                    productId,
                    storeId
                ]
            );

        const currentProduct =
            currentRows?.[0];

        if (currentProduct?.category_id) {
            whereExtra =
                "AND p.category_id = ? AND p.id <> ?";

            params.push(
                currentProduct.category_id,
                productId
            );
        } else {
            whereExtra =
                "AND p.id <> ?";

            params.push(productId);
        }

    }

    const [rows] =
        await db.execute(
            `
            SELECT
                p.id,
                p.slug,
                p.title,
                p.price,
                p.sale_price,
                p.currency,
                p.category_id,
                p.is_featured,
                img.image_url,
                p.sku,
                c.name AS category_name

            FROM tags_store_products p

            LEFT JOIN tags_store_categories c
                ON c.id = p.category_id

            LEFT JOIN
                tags_store_product_images img
                    ON img.product_id = p.id
                    AND img.is_primary = 1

            WHERE
                p.store_id = ?
                AND p.is_visible = 1
                AND p.status = 'published'
                ${whereExtra}

            ORDER BY
                p.created_at DESC

            LIMIT ${safeLimit}
            `,
            params
        );

    return rows;

}