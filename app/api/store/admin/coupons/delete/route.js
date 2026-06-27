// =====================================
// API: /api/store/admin/coupons/delete
// Descripción: Elimina un cupón.
// Contexto: store
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);

        const businessId = searchParams.get("businessId");
        const couponId = searchParams.get("couponId");

        if (!businessId || !couponId) {
            return Response.json(
                { error: "businessId y couponId requeridos" },
                { status: 400 }
            );
        }

        const [storeRows] = await db.execute(
            `
            SELECT id
            FROM tags_stores
            WHERE business_id = ?
            LIMIT 1
            `,
            [businessId]
        );

        const store = storeRows?.[0];

        if (!store) {
            return Response.json(
                { error: "Tienda no encontrada" },
                { status: 404 }
            );
        }

        await db.execute(
            `
            DELETE FROM tags_store_coupons
            WHERE id = ?
            AND store_id = ?
            `,
            [
                couponId,
                store.id
            ]
        );

        return Response.json({
            success: true
        });

    } catch (error) {
        console.error("STORE COUPONS DELETE:", error);

        return Response.json(
            { error: "Error eliminando cupón" },
            { status: 500 }
        );
    }
}