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
                    error:
                        "product_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        const [rows] =
            await db.execute(
                `
                SELECT
                    q.id,
                    q.code,
                    q.label
                FROM tags_qr_codes q
                LEFT JOIN tags_sale_item_qrs sq
                    ON sq.qr_id = q.id
                WHERE q.product_id = ?
                AND q.status = 'available'
                AND sq.id IS NULL
                ORDER BY q.id ASC
                `,
                [product_id]
            );

        return Response.json({
            ok: true,
            data: rows
        });

    } catch (err) {

        console.error(
            "AVAILABLE QR ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error interno",
                data: []
            },
            {
                status: 500
            }
        );
    }
}