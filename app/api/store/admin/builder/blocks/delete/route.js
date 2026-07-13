// =====================================
// API:
// /api/store/admin/builder/blocks/delete
//
// Descripción:
// Elimina un bloque del Builder
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
            blockId
        } = await req.json();

        if (!sectionId || !blockId) {
            return Response.json(
                {
                    error: "sectionId y blockId son requeridos"
                },
                {
                    status: 400
                }
            );
        }

        await db.query(
            `
            DELETE
            FROM tags_store_blocks
            WHERE id = ?
            AND section_id = ?
            `,
            [
                blockId,
                sectionId
            ]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {
        console.error(
            "STORE BLOCK DELETE ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error eliminando bloque"
            },
            {
                status: 500
            }
        );
    }
}