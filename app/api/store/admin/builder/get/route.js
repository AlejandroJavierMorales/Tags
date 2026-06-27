// =====================================
// API:
// /api/store/admin/builder/get
//
// Descripción:
// Obtiene toda la estructura del
// builder de una tienda.
//
// Retorna:
// - store
// - sections
// - blocks
//
// Utilizado por:
// - Store Builder
// - Store Preview
// - Store Renderer
//
// Método:
// GET
//
// Contexto:
// store
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const storeId =
            searchParams.get(
                "storeId"
            );

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

        // -----------------------------
        // STORE
        // -----------------------------

        const [storeRows] =
            await db.execute(
                `
                SELECT *
                FROM tags_stores
                WHERE id = ?
                LIMIT 1
                `,
                [
                    storeId
                ]
            );

        const store =
            storeRows?.[0];

        if (!store) {

            return Response.json(
                {
                    error:
                        "Tienda no encontrada"
                },
                {
                    status: 404
                }
            );

        }

        // -----------------------------
        // SECTIONS
        // -----------------------------

        const [sections] =
            await db.execute(
                `
                SELECT *
                FROM tags_store_sections
                WHERE store_id = ?
                ORDER BY sort_order ASC
                `,
                [
                    storeId
                ]
            );

        // -----------------------------
        // BLOCKS
        // -----------------------------

        const [blocks] =
            await db.execute(
                `
                SELECT
                    b.*
                FROM tags_store_blocks b
                INNER JOIN tags_store_sections s
                    ON s.id = b.section_id
                WHERE s.store_id = ?
                ORDER BY
                    s.sort_order ASC,
                    b.sort_order ASC
                `,
                [
                    storeId
                ]
            );

        // -----------------------------
        // PARSE JSONS
        // -----------------------------

        const parsedSections =
            sections.map(
                section => ({

                    ...section,

                    settings_json:
                        safeParse(
                            section.settings_json
                        )

                })
            );

        const parsedBlocks =
            blocks.map(
                block => ({

                    ...block,

                    content_json:
                        safeParse(
                            block.content_json
                        ),

                    styles_json:
                        safeParse(
                            block.styles_json
                        ),

                    animation_json:
                        safeParse(
                            block.animation_json
                        )

                })
            );

        return Response.json({

            success: true,

            store,

            sections:
                parsedSections,

            blocks:
                parsedBlocks

        });

    } catch (error) {

        console.error(
            "STORE BUILDER GET:",
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

function safeParse(value) {

    try {

        return value
            ? JSON.parse(value)
            : {};

    } catch {

        return {};

    }

}