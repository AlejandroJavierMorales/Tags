// =====================================
// API: /api/store/admin/coupons/list
// Descripción: Lista cupones de una tienda.
// Contexto: store
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const businessId = searchParams.get("businessId");

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
                { status: 400 }
            );
        }

        const [storeRows] = await db.execute(
            `
            SELECT id
            FROM tags_stores
            WHERE business_id = ?
            AND app_type = 'store'
            LIMIT 1
            `,
            [businessId]
        );

        const store = storeRows?.[0];

        if (!store) {
            return Response.json({
                coupons: [],
                storeMissing: true
            });
        }

        const [coupons] = await db.execute(
            `
            SELECT *
            FROM tags_store_coupons
            WHERE store_id = ?
            ORDER BY created_at DESC, id DESC
            `,
            [store.id]
        );

        return Response.json({
            storeId: store.id,
            coupons
        });

    } catch (error) {
        console.error("STORE COUPONS LIST:", error);

        return Response.json(
            { error: "Error listando cupones" },
            { status: 500 }
        );
    }
}
