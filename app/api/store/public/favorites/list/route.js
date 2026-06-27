// =====================================
// API:
// /api/store/public/favorites/list
//
// Descripción:
// Obtiene los productos favoritos
// de una sesión pública.
//
// Método:
// GET
//
// Query:
// - storeId
// - sessionId
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
            searchParams.get("storeId");

        const sessionId =
            searchParams.get("sessionId");

        if (
            !storeId ||
            !sessionId
        ) {
            return Response.json({
                favorites: []
            });
        }

        const [rows] =
            await db.execute(
                `
                SELECT product_id
                FROM tags_store_favorites
                WHERE store_id = ?
                AND session_id = ?
                `,
                [
                    storeId,
                    sessionId
                ]
            );

        return Response.json({
            favorites:
                rows.map(row =>
                    Number(row.product_id)
                )
        });

    } catch (error) {

        console.error(
            "STORE FAVORITES LIST:",
            error
        );

        return Response.json(
            {
                error:
                    "Error obteniendo favoritos"
            },
            {
                status: 500
            }
        );

    }

}