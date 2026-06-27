// =====================================
// Archivo:
// /app/modules/store/lib/getStorePublicCategories.js
//
// Descripción:
// Obtiene categorías visibles de una tienda.
//
// Utilizado por:
// - StoreCategoryMenuBlock
//
// Contexto:
// store
// =====================================

import { db }
    from "@/app/lib/tags-db";

export async function getStorePublicCategories(storeId) {
    if (!storeId) {
        return [];
    }

    const [rows] =
        await db.execute(
            `
            SELECT
                id,
                name,
                slug,
                description,
                image_url
            FROM tags_store_categories
            WHERE store_id = ?
            AND is_visible = 1
            ORDER BY sort_order ASC, name ASC
            `,
            [storeId]
        );

    return rows;
}