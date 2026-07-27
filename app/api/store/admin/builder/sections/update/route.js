// =====================================
// API:
// /api/store/admin/builder/sections/update
//
// Descripción:
// Actualiza una sección del Builder
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
            storeId,
            sectionId,
            title,
            section_type,
            is_visible,
            settings_json
        } = body;

        if (!storeId || !sectionId) {
            return Response.json(
                {
                    error: "storeId y sectionId son requeridos"
                },
                {
                    status: 400
                }
            );
        }

        const access =
            await requireStoreResourceAccess({
                storeId,
                sectionId
            });
        if (!access.allowed) {
            return storeAccessResponse(access);
        }

        await db.query(
            `
            UPDATE tags_store_sections
            SET
                title = ?,
                section_type = ?,
                is_visible = ?,
                settings_json = ?,
                updated_at = NOW()
            WHERE id = ?
            AND store_id = ?
            `,
            [
                title || null,
                section_type,
                is_visible ? 1 : 0,
                JSON.stringify(settings_json || {}),
                sectionId,
                storeId
            ]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {
        console.error(
            "STORE SECTION UPDATE ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error actualizando sección"
            },
            {
                status: 500
            }
        );
    }
}
