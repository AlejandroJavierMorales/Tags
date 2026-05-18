import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const product_id =
            searchParams.get("product_id");

        if (!product_id) {

            return Response.json(
                {
                    ok: false,
                    error: "product_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        const [rows] = await db.execute(
                    `
            SELECT
                id,
                code,
                label,
                status
            FROM tags_qr_codes
            WHERE product_id = ?
            AND status = 'generated'
            AND production_order_id IS NULL
            ORDER BY id ASC
            `,
            [product_id]
        );

        return Response.json({
            ok: true,
            data: rows
        });

    } catch (err) {

        console.error(
            "GENERATED QR API ERROR:",
            err
        );

        return Response.json(
            {
                ok: false,
                error: "Error interno",
                data: []
            },
            {
                status: 500
            }
        );
    }
}