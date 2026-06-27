// =====================================
// Archivo:
// /app/modules/store/lib/getStorePublicProducts.js
//
// Descripción:
// Obtiene productos publicados de una tienda,
// incluyendo imagen principal.
//
// Utilizado por:
// - StoreProductGridBlock
//
// Contexto:
// store
// =====================================

import { db }
    from "@/app/lib/tags-db";

export async function getStorePublicProducts(
    storeId,
    limit = 24
) {

    if (!storeId) {
        return [];
    }

    const safeLimit =
        Math.max(
            1,
            Math.min(
                Number(limit) || 24,
                100
            )
        );

    const [rows] =
        await db.execute(
            `
            SELECT
                p.id,
                p.store_id,
                p.category_id,
                c.name AS category_name,
                c.slug AS category_slug,
                p.slug,
                p.title,
                p.description,
                p.price,
                p.sale_price,
                p.currency,
                p.stock_enabled,
                p.stock_qty,
                p.is_featured,
                img.image_url
            FROM tags_store_products p

            LEFT JOIN tags_store_categories c
                ON c.id = p.category_id

            LEFT JOIN tags_store_product_images img
                ON img.product_id = p.id
                AND img.is_primary = 1

            WHERE p.store_id = ?
            AND p.is_visible = 1
            AND p.status = 'published'

            ORDER BY
                p.is_featured DESC,
                p.created_at DESC

            LIMIT ${safeLimit}
            `,
            [
                storeId
            ]
        );

    return rows;

}