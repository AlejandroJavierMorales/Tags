// =====================================
// API:
// /api/store/public/favorites/toggle
//
// Descripción:
// Agrega o elimina un producto
// de favoritos.
//
// Proceso:
// 1. Valida datos.
// 2. Busca favorito existente.
// 3. Si existe -> elimina.
// 4. Si no existe -> crea.
//
// Método:
// POST
//
// Parámetros:
// - storeId
// - productId
// - sessionId
//
// Respuesta:
// {
//   success: true,
//   isFavorite: true|false
// }
//
// Contexto:
// store
// =====================================

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function POST(req) {

    try {
        const {
            storeId,
            productId,
            sessionId
        } =
            await req.json();

        if (!storeId || !productId || !sessionId) {
            return Response.json(
                {
                    error: "Datos incompletos"
                },
                {
                    status: 400
                }
            );
        }

        const [existingRows] =
            await db.execute(
                `
                SELECT id
                FROM tags_store_favorites
                WHERE store_id = ?
                AND product_id = ?
                AND session_id = ?
                LIMIT 1
                `,
                [
                    storeId,
                    productId,
                    sessionId
                ]
            );

        const existing =
            existingRows?.[0];

        if (existing) {
            await db.execute(
                `
                DELETE FROM tags_store_favorites
                WHERE id = ?
                `,
                [
                    existing.id
                ]
            );

            return Response.json({
                success: true,
                isFavorite: false
            });
        }

        await db.execute(
            `
            INSERT INTO tags_store_favorites
            (
                store_id,
                product_id,
                session_id,
                created_at
            )
            VALUES
            (?, ?, ?, NOW())
            `,
            [
                storeId,
                productId,
                sessionId
            ]
        );

        return Response.json({
            success: true,
            isFavorite: true
        });

    } catch (error) {
        console.error(
            "STORE FAVORITE TOGGLE:",
            error
        );

        return Response.json(
            {
                error: "Error actualizando favoritos"
            },
            {
                status: 500
            }
        );
    }

}