export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const storeId =
            searchParams.get("storeId");

        if (!storeId) {
            return Response.json(
                {
                    error:
                        "storeId requerido"
                },
                {
                    status: 400
                }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT *
                FROM tags_store_shipping_methods
                WHERE store_id = ?
                AND is_active = 1
                ORDER BY sort_order ASC,
                         name ASC
                `,
                [
                    storeId
                ]
            );

        return Response.json({
            ok: true,
            methods: rows
        });

    } catch (err) {

        console.error(
            "STORE SHIPPING LIST ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error obteniendo métodos de envío"
            },
            {
                status: 500
            }
        );
    }
}