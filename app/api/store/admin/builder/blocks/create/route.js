// =====================================
// API:
// /api/store/admin/builder/blocks/create
//
// Descripción:
// Crea un bloque del Builder
// de Tags Store.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function POST(req) {
    try {
        const {
            sectionId,
            block_type,
            title,
            content_json,
            styles_json,
            animation_json
        } = await req.json();

        if (!sectionId || !block_type) {
            return Response.json(
                {
                    error: "sectionId y block_type son requeridos"
                },
                {
                    status: 400
                }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT COALESCE(MAX(sort_order), 0) AS max_order
                FROM tags_store_blocks
                WHERE section_id = ?
                `,
                [
                    sectionId
                ]
            );

        const nextOrder =
            Number(rows?.[0]?.max_order || 0) + 1;

        const [result] =
            await db.query(
                `
                INSERT INTO tags_store_blocks (
                    section_id,
                    block_type,
                    title,
                    content_json,
                    styles_json,
                    animation_json,
                    is_visible,
                    sort_order,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())
                `,
                [
                    sectionId,
                    block_type,
                    title || null,
                    JSON.stringify(content_json || {}),
                    JSON.stringify(styles_json || {}),
                    JSON.stringify(animation_json || {}),
                    nextOrder
                ]
            );

        return Response.json({
            ok: true,
            blockId: result.insertId
        });

    } catch (err) {
        console.error(
            "STORE BLOCK CREATE ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error creando bloque"
            },
            {
                status: 500
            }
        );
    }
}