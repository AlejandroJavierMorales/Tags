// =====================================
// API:
// /api/store/admin/builder/blocks/reorder
//
// Descripción:
// Reordena bloques dentro de una sección
// del Builder de Tags Store.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function POST(req) {
    try {
        const {
            sectionId,
            blocks
        } = await req.json();

        if (!sectionId) {
            return Response.json(
                { error: "sectionId requerido" },
                { status: 400 }
            );
        }

        if (!Array.isArray(blocks) || !blocks.length) {
            return Response.json(
                { error: "blocks requerido" },
                { status: 400 }
            );
        }

        for (const item of blocks) {
            if (!item.id) {
                continue;
            }

            await db.query(
                `
                UPDATE tags_store_blocks
                SET
                    sort_order = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND section_id = ?
                `,
                [
                    Number(item.sort_order) || 0,
                    item.id,
                    sectionId
                ]
            );
        }

        return Response.json({
            ok: true
        });

    } catch (err) {
        console.error(
            "STORE BLOCK REORDER ERROR:",
            err
        );

        return Response.json(
            { error: "Error reordenando bloques" },
            { status: 500 }
        );
    }
}