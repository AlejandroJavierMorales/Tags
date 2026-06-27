// =====================================
// Archivo:
// /app/modules/store/lib/getStoreFeaturedProducts.js
//
// Descripción:
// Obtiene productos destacados publicados
// de una tienda.
//
// Contexto:
// store
// =====================================

import { db }
    from "@/app/lib/tags-db";

export async function getStoreFeaturedProducts(
    storeId,
    limit = 8
) {

    if (!storeId) {
        return [];
    }

    const safeLimit =
        Math.max(
            1,
            Math.min(
                Number(limit) || 8,
                20
            )
        );

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
                img.image_url
            FROM tags_store_products p

            LEFT JOIN
                tags_store_product_images img
                    ON img.product_id = p.id
                    AND img.is_primary = 1

            WHERE
                p.store_id = ?
                AND p.is_visible = 1
                AND p.status = 'published'
                AND p.is_featured = 1

            ORDER BY
                p.created_at DESC

            LIMIT ${safeLimit}
            `,
            [storeId]
        );

    return rows;

}