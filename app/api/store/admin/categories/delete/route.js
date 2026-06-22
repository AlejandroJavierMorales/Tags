// =====================================
// API: /api/store/admin/categories/delete
// Descripción: Elimina una categoría de Tags Tienda.
// Uso: Dashboard Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            businessId,
            categoryId
        } = body;

        if (!businessId || !categoryId) {
            return Response.json(
                {
                    error: "businessId y categoryId son requeridos"
                },
                {
                    status: 400
                }
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT id
                FROM tags_stores
                WHERE business_id = ?
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json(
                {
                    error: "Tienda no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const [[productsCount]] =
            await db.query(
                `
                SELECT COUNT(*) AS total
                FROM tags_store_products
                WHERE category_id = ?
                AND store_id = ?
                `,
                [
                    categoryId,
                    store.id
                ]
            );

        if (Number(productsCount.total || 0) > 0) {
            return Response.json(
                {
                    error: "No se puede eliminar una categoría con productos asignados"
                },
                {
                    status: 409
                }
            );
        }

        await db.query(
            `
            DELETE FROM tags_store_categories
            WHERE id = ?
            AND store_id = ?
            `,
            [
                categoryId,
                store.id
            ]
        );

        return Response.json({
            ok: true,
            message: "Categoría eliminada correctamente"
        });

    } catch (err) {
        console.error(
            "STORE CATEGORY DELETE ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error eliminando categoría"
            },
            {
                status: 500
            }
        );
    }
}