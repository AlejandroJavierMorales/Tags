// =====================================
// Archivo:
// /app/modules/builder/lib/getBuilderStructure.js
//
// Descripción:
// Obtiene la estructura completa
// de una entidad renderizable.
//
// Utilizado por:
// - Store
// - Resto
// - Reservas
// - QR Page
//
// Contexto:
// shared
// =====================================

import { db }
    from "@/app/lib/tags-db";

export async function getStoreBuilderStructure(
    storeId
) {

    const [sections] =
        await db.execute(
            `
            SELECT *
            FROM tags_store_sections
            WHERE store_id = ?
            ORDER BY sort_order
            `,
            [storeId]
        );

    const [blocks] =
        await db.execute(
            `
            SELECT b.*
            FROM tags_store_blocks b
            INNER JOIN tags_store_sections s
                ON s.id = b.section_id
            WHERE s.store_id = ?
            ORDER BY
                s.sort_order,
                b.sort_order
            `,
            [storeId]
        );

    return {
        sections,
        blocks
    };
}