// =====================================
// API:
// /api/store/admin/template/apply
//
// Descripción:
// Aplica una plantilla completa
// a una tienda.
//
// Proceso:
// 1. Busca template.
// 2. Borra secciones actuales.
// 3. Borra bloques actuales.
// 4. Inserta nuevas secciones.
// 5. Inserta nuevos bloques.
//
// Método:
// POST
//
// Contexto:
// store
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            storeId,
            templateCode
        } = body;

        if (!storeId) {

            return Response.json(
                {
                    error:
                        "storeId requerido"
                },
                {
                    status: 400
                }
            );

        }

        if (!templateCode) {

            const {
                installStoreTemplate
            } =
                await import(
                    "@/app/modules/store/lib/installStoreTemplate"
                );

            await installStoreTemplate(
                storeId
            );

            return Response.json({
                success: true,
                source: "defaultStoreTemplate"
            });

        }

        // -------------------------
        // TEMPLATE
        // -------------------------

        const [templateRows] =
            await db.execute(
                `
                SELECT *
                FROM tags_store_templates
                WHERE code = ?
                LIMIT 1
                `,
                [
                    templateCode
                ]
            );

        const template =
            templateRows?.[0];

        if (!template) {

            return Response.json(
                {
                    error:
                        "Template no encontrado"
                },
                {
                    status: 404
                }
            );

        }

        const sectionsJson =
            JSON.parse(
                template.sections_json || "[]"
            );

        // -------------------------
        // ELIMINAR BLOQUES
        // -------------------------

        await db.execute(
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

        // -------------------------
        // ELIMINAR SECCIONES
        // -------------------------

        await db.execute(
            `
            DELETE
            FROM tags_store_sections
            WHERE store_id = ?
            `,
            [
                storeId
            ]
        );

        // -------------------------
        // CREAR NUEVAS
        // -------------------------

        for (
            const sectionData
            of sectionsJson
        ) {

            const [sectionResult] =
                await db.execute(
                    `
                    INSERT INTO
                    tags_store_sections
                    (
                        store_id,
                        section_type,
                        title,
                        is_visible,
                        sort_order,
                        settings_json
                    )
                    VALUES
                    (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        storeId,
                        sectionData.section_type,
                        sectionData.title || null,
                        1,
                        sectionData.sort_order || 0,
                        JSON.stringify({})
                    ]
                );

            const sectionId =
                sectionResult.insertId;

            const blocks =
                sectionData.blocks || [];

            for (
                const blockData
                of blocks
            ) {

                await db.execute(
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
                        JSON.stringify(
                            blockData.content || {}
                        ),
                        JSON.stringify(
                            blockData.styles || {}
                        ),
                        JSON.stringify(
                            blockData.animation || {}
                        ),
                        1,
                        blockData.sort_order || 0
                    ]
                );

            }

        }

        return Response.json({
            success: true
        });

    } catch (error) {

        console.error(
            "STORE TEMPLATE APPLY:",
            error
        );

        return Response.json(
            {
                error:
                    error.message
            },
            {
                status: 500
            }
        );

    }

}