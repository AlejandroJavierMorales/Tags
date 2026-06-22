// =====================================
// API: /api/store/admin/shipping-methods/delete
// Descripción: Elimina métodos de envío.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function DELETE(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        const methodId =
            searchParams.get("methodId");

        if (!businessId || !methodId) {
            return Response.json(
                { error: "businessId y methodId son requeridos" },
                { status: 400 }
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
                [businessId]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json(
                { error: "Tienda no encontrada" },
                { status: 404 }
            );
        }

        await db.query(
            `
            DELETE FROM tags_store_shipping_methods
            WHERE id = ?
            AND store_id = ?
            `,
            [
                methodId,
                store.id
            ]
        );

        return Response.json({
            ok: true,
            message: "Método eliminado correctamente"
        });

    } catch (err) {
        console.error(
            "STORE SHIPPING METHOD DELETE ERROR:",
            err
        );

        return Response.json(
            { error: "Error eliminando método de envío" },
            { status: 500 }
        );
    }
}