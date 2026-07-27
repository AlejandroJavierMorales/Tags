// =====================================
// API:
// /api/store/admin/builder/sections/reorder
//
// Descripción:
// Reordena las secciones del Builder
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
            sections
        } = await req.json();

        if (!storeId) {

            return Response.json(
                {
                    error: "storeId requerido"
                },
                {
                    status: 400
                }
            );

        }

        const access =
            await requireStoreResourceAccess({
                storeId
            });
        if (!access.allowed) {
            return storeAccessResponse(access);
        }

        if (
            !Array.isArray(sections) ||
            !sections.length
        ) {

            return Response.json(
                {
                    error: "sections requerido"
                },
                {
                    status: 400
                }
            );

        }

        const [stores] =
            await db.query(
                `
                SELECT id
                FROM tags_stores
                WHERE id = ?
                LIMIT 1
                `,
                [
                    storeId
                ]
            );

        if (!stores.length) {

            return Response.json(
                {
                    error: "Tienda no encontrada"
                },
                {
                    status: 404
                }
            );

        }

        for (const item of sections) {

            await db.query(
                `
                UPDATE
                    tags_store_sections
                SET
                    sort_order = ?,
                    updated_at = NOW()
                WHERE
                    id = ?
                    AND store_id = ?
                `,
                [
                    Number(
                        item.sort_order
                    ) || 0,
                    item.id,
                    storeId
                ]
            );

        }

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.error(err);

        return Response.json(
            {
                error: err.message
            },
            {
                status: 500
            }
        );

    }

}
