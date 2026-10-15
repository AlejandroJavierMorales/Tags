// =====================================
// API:
// /api/store/admin/builder/sections/delete
//
// Descripción:
// Elimina una sección del Builder
// de Tags Store junto con sus bloques.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";
import { requireStoreResourceAccess, storeAccessResponse }
    from "@/app/modules/store/lib/storeAdminAccess";
import { refreshDestinationBusinessProjection } from "@/app/modules/destination-ai/server/refreshDestinationBusinessProjection";

export async function POST(req) {
    const conn =
        await db.getConnection();

    try {
        const {
            storeId,
            sectionId
        } = await req.json();

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

        await conn.beginTransaction();

        await conn.query(
            `
            DELETE b
            FROM tags_store_blocks b
            INNER JOIN tags_store_sections s
                ON s.id = b.section_id
            WHERE s.id = ?
            AND s.store_id = ?
            `,
            [
                sectionId,
                storeId
            ]
        );

        await conn.query(
            `
            DELETE
            FROM tags_store_sections
            WHERE id = ?
            AND store_id = ?
            `,
            [
                sectionId,
                storeId
            ]
        );

        await conn.commit();

        await refreshDestinationBusinessProjection(access.store.business_id).catch(error => console.error("DESTINATION PROJECTION STORE SECTION DELETE SYNC ERROR", { businessId: access.store.business_id, error }));

        return Response.json({
            ok: true
        });

    } catch (err) {
        await conn.rollback();

        console.error(
            "STORE SECTION DELETE ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error eliminando sección"
            },
            {
                status: 500
            }
        );

    } finally {
        conn.release();
    }
}
