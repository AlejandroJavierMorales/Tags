// =====================================
// Archivo:
// /app/modules/resto/lib/installRestoTemplate.js
//
// Descripción:
// Instala la plantilla pública por defecto
// de Tags Resto.
//
// Proceso:
// 1. Elimina bloques existentes.
// 2. Elimina secciones existentes.
// 3. Lee defaultRestoTemplate.
// 4. Crea las secciones.
// 5. Crea los bloques con su configuración inicial.
//
// Contexto:
// resto
// =====================================

import { db }
    from "@/app/lib/tags-db";

import {
    defaultRestoTemplate
}
    from "./defaultRestoTemplate";

import {
    getRestoModule
}
    from "@/app/modules/resto/lib/restoModuleRegistry";

export async function installRestoTemplate(
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

    // =====================================
    // ELIMINAR BLOQUES EXISTENTES
    // =====================================

    await connection.execute(
        `
        DELETE b
        FROM tags_store_blocks b

        INNER JOIN tags_store_sections s
            ON s.id = b.section_id

        WHERE s.store_id = ?
        `,
        [
            storeId
        ]
    );

    // =====================================
    // ELIMINAR SECCIONES EXISTENTES
    // =====================================

    await connection.execute(
        `
        DELETE
        FROM tags_store_sections
        WHERE store_id = ?
        `,
        [
            storeId
        ]
    );

    // =====================================
    // CREAR PLANTILLA
    // =====================================

    for (
        const sectionData
        of defaultRestoTemplate
    ) {

        const [sectionResult] =
            await connection.execute(
                `
                INSERT INTO tags_store_sections (
                    store_id,
                    code,
                    title,
                    section_type,
                    is_visible,
                    sort_order,
                    settings_json
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
                `,
                [
                    storeId,
                    sectionData.code || null,
                    sectionData.title || null,
                    sectionData.section_type,
                    sectionData.is_visible === 0
                        ? 0
                        : 1,
                    Number(
                        sectionData.sort_order || 0
                    ),
                    JSON.stringify(
                        sectionData.settings || {}
                    )
                ]
            );

        const sectionId =
            sectionResult.insertId;

        const blocks =
            Array.isArray(
                sectionData.blocks
            )
                ? sectionData.blocks
                : [];

        for (
            const blockData
            of blocks
        ) {

            const module =
                getRestoModule(
                    blockData.block_type
                );

            if (!module) {

                throw new Error(
                    `Módulo Resto inexistente: ${blockData.block_type}`
                );

            }

            const content =
                blockData.content ||
                module.defaultContent ||
                {};

            const styles =
                blockData.styles ||
                module.defaultStyles ||
                {};

            const animation =
                blockData.animation ||
                module.defaultAnimation ||
                {};

            await connection.execute(
                `
                INSERT INTO tags_store_blocks (
                    section_id,
                    block_type,
                    title,
                    content_json,
                    styles_json,
                    animation_json,
                    is_visible,
                    sort_order
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
                `,
                [
                    sectionId,
                    blockData.block_type,
                    blockData.title || null,
                    JSON.stringify(content),
                    JSON.stringify(styles),
                    JSON.stringify(animation),
                    blockData.is_visible === 0
                        ? 0
                        : 1,
                    Number(
                        blockData.sort_order || 0
                    )
                ]
            );

        }

    }

    return {
        success: true,
        storeId
    };

}