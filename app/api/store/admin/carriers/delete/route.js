// =====================================
// API: /api/store/admin/carriers/delete
// Descripción: Elimina transportistas de Tags Tienda.
// Uso: Dashboard Tags Tienda / Envíos.
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

        const carrierId =
            searchParams.get("carrierId");

        if (!businessId || !carrierId) {
            return Response.json(
                { error: "businessId y carrierId son requeridos" },
                { status: 400 }
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'store'
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
            DELETE FROM tags_store_carriers
            WHERE id = ?
            AND store_id = ?
            `,
            [
                carrierId,
                store.id
            ]
        );

        return Response.json({
            ok: true,
            message: "Transportista eliminado correctamente"
        });

    } catch (err) {
        console.error(
            "STORE CARRIER DELETE ERROR:",
            err
        );

        return Response.json(
            { error: "Error eliminando transportista" },
            { status: 500 }
        );
    }
}
