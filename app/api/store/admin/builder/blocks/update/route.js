// =====================================
// API:
// /api/store/admin/builder/blocks/update
//
// Descripción:
// Actualiza un bloque del Builder
// de Tags Store.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireStoreResourceAccess, storeAccessResponse }
    from "@/app/modules/store/lib/storeAdminAccess";

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            sectionId,
            blockId,
            block_type,
            title,
            content_json,
            styles_json,
            animation_json,
            is_visible
        } = body;

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

        const access =
            await requireStoreResourceAccess({
                sectionId
            });
        if (!access.allowed) {
            return storeAccessResponse(access);
        }

        await db.query(
            `
            UPDATE tags_store_blocks
            SET
                block_type = ?,
                title = ?,
                content_json = ?,
                styles_json = ?,
                animation_json = ?,
                is_visible = ?,
                updated_at = NOW()
            WHERE id = ?
            AND section_id = ?
            `,
            [
                block_type,
                title || null,
                JSON.stringify(content_json || {}),
                JSON.stringify(styles_json || {}),
                JSON.stringify(animation_json || {}),
                is_visible ? 1 : 0,
                blockId,
                sectionId
            ]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {
        console.error(
            "STORE BLOCK UPDATE ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error actualizando bloque"
            },
            {
                status: 500
            }
        );
    }
}
