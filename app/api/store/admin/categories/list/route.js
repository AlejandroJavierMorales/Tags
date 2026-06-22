// =====================================
// API: /api/store/admin/categories/list
// Descripción: Lista las categorías de una tienda por businessId.
// Uso: Dashboard Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        if (!businessId) {
            return Response.json(
                {
                    error: "businessId es requerido"
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
            return Response.json({
                ok: true,
                storeId: null,
                storeMissing: true,
                categories: []
            });
        }

        const [categories] =
            await db.query(
                `
                SELECT *
                FROM tags_store_categories
                WHERE store_id = ?
                ORDER BY sort_order ASC, name ASC
                `,
                [
                    store.id
                ]
            );

        return Response.json({
            ok: true,
            storeId: store.id,
            categories
        });

    } catch (err) {
        console.error(
            "STORE CATEGORIES LIST ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error listando categorías"
            },
            {
                status: 500
            }
        );
    }
}