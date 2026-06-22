// =====================================
// API: /api/store/admin/shipping-methods/list
// Descripción: Lista métodos de envío de Tags Tienda.
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
                { error: "businessId es requerido" },
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
            return Response.json({
                ok: true,
                storeMissing: true,
                methods: []
            });
        }

        const [methods] =
            await db.query(
                `
                SELECT
                    m.*,
                    c.name AS carrier_name,
                    c.type AS carrier_type
                FROM tags_store_shipping_methods m

                LEFT JOIN tags_store_carriers c
                    ON c.id = m.carrier_id

                WHERE m.store_id = ?

                ORDER BY
                    m.sort_order ASC,
                    m.id ASC
                `,
                [store.id]
            );

        return Response.json({
            ok: true,
            storeId: store.id,
            methods
        });

    } catch (err) {
        console.error(
            "STORE SHIPPING METHODS LIST ERROR:",
            err
        );

        return Response.json(
            { error: "Error listando métodos de envío" },
            { status: 500 }
        );
    }
}