// =====================================
// API:
// /api/store/admin/builder/sections/create
//
// Descripción:
// Crea una sección del Builder
// de Tags Store.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";
import { requireStoreResourceAccess, storeAccessResponse }
    from "@/app/modules/store/lib/storeAdminAccess";

export async function POST(req) {
    try {
        const {
            storeId,
            section_type,
            title,
            settings_json
        } = await req.json();

        if (!storeId || !section_type) {
            return Response.json(
                {
                    error: "storeId y section_type son requeridos"
                },
                {
                    status: 400
                }
            );
        }

        const access =
            await requireStoreResourceAccess({ storeId });
        if (!access.allowed) {
            return storeAccessResponse(access);
        }

        const [rows] =
            await db.query(
                `
                SELECT COALESCE(MAX(sort_order), 0) AS max_order
                FROM tags_store_sections
                WHERE store_id = ?
                `,
                [
                    storeId
                ]
            );

        const nextOrder =
            Number(rows?.[0]?.max_order || 0) + 1;

        const [result] =
            await db.query(
                `
                INSERT INTO tags_store_sections (
                    store_id,
                    title,
                    section_type,
                    is_visible,
                    sort_order,
                    settings_json,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, 1, ?, ?, NOW(), NOW())
                `,
                [
                    storeId,
                    title || null,
                    section_type,
                    nextOrder,
                    JSON.stringify(settings_json || {})
                ]
            );

        return Response.json({
            ok: true,
            sectionId: result.insertId
        });

    } catch (err) {
        console.error(
            "STORE SECTION CREATE ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error creando sección"
            },
            {
                status: 500
            }
        );
    }
}
