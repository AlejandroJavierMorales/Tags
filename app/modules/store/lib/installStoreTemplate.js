// =====================================
// Archivo:
// /app/modules/store/lib/installStoreTemplate.js
//
// Descripción:
// Instala la plantilla por defecto
// de Tags Store en una tienda.
//
// Proceso:
// 1. Elimina bloques existentes.
// 2. Elimina secciones existentes.
// 3. Lee defaultStoreTemplate.
// 4. Crea secciones.
// 5. Crea bloques.
//
// Utilizado por:
// - /api/store/admin/save
// - futuros templates
//
// Contexto:
// store
// =====================================

import { db }
    from "@/app/lib/tags-db";

import {
    defaultStoreTemplate
}
    from "./defaultStoreTemplate";

import {
    getStoreModule
}
    from "@/app/modules/store/lib/storeModuleRegistry";

export async function installStoreTemplate(
    storeId,
    conn = null
) {

    if (!storeId) {
        throw new Error(
            "storeId requerido"
        );
    }

    const connection =
        conn || db;


    // -----------------------------
    // ELIMINAR BLOQUES
    // -----------------------------

    await connection.execute(
        `
        DELETE b
        FROM tags_store_blocks b
        INNER JOIN tags_store_sections s
            ON s.id = b.section_id
        WHERE s.store_id = ?
        `,
        [storeId]
    );

    // -----------------------------
    // ELIMINAR SECCIONES
    // -----------------------------

    await connection.execute(
        `
        DELETE
        FROM tags_store_sections
        WHERE store_id = ?
        `,
        [storeId]
    );

    // -----------------------------
    // CREAR TEMPLATE
    // -----------------------------

    for (
        const sectionData
        of defaultStoreTemplate
    ) {

        const [sectionResult] =
            await connection.execute(
                `
                INSERT INTO
                tags_store_sections
                (
                    store_id,
                    code,
                    title,
                    section_type,
                    is_visible,
                    sort_order,
                    settings_json
                )
                VALUES
                (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    storeId,
                    sectionData.code || null,
                    sectionData.title || null,
                    sectionData.section_type,
                    1,
                    sectionData.sort_order || 0,
                    JSON.stringify(
                        sectionData.settings || {}
                    )
                ]
            );

        const sectionId =
            sectionResult.insertId;

        const blocks =
            sectionData.blocks || [];

        const module =
            getStoreModule(
                blockData.block_type
            );

        const content =
            blockData.content ||
            module?.defaultContent ||
            {};

        const styles =
            blockData.styles ||
            module?.defaultStyles ||
            {};

        const animation =
            blockData.animation ||
            module?.defaultAnimation ||
            {};

        for (
            const blockData
            of blocks
        ) {

            await connection.execute(
                `
                INSERT INTO
                tags_store_blocks
                (
                    section_id,
                    block_type,
                    title,
                    content_json,
                    styles_json,
                    animation_json,
                    is_visible,
                    sort_order
                )
                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    sectionId,
                    blockData.block_type,
                    blockData.title || null,
                    JSON.stringify(content),
                    JSON.stringify(styles),
                    JSON.stringify(animation),
                    1,
                    blockData.sort_order || 0
                ]
            );

        }

    }

    return {
        success: true
    };

}