import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const status =
            searchParams.get("status") || "";

        const business =
            searchParams.get("business") || "";

        const orderId =
            searchParams.get("order_id") || "";

        const qr =
            searchParams.get("qr") || "";

        let sql = `
            SELECT
                po.id,
                po.product_id,
                po.business_id,
                po.quantity,
                po.status,
                po.notes,
                po.created_at,

                p.name AS product_name,

                b.name AS business_name

            FROM tags_production_orders po

            JOIN tags_products p
                ON p.id = po.product_id

            LEFT JOIN tags_businesses b
                ON b.id = po.business_id

            WHERE 1=1
        `;

        const params = [];

        // =========================
        // FILTER STATUS
        // =========================

        if (status) {

            sql += `
                AND po.status = ?
            `;

            params.push(status);
        }

        // =========================
        // FILTER CLIENT
        // =========================

        if (business) {

            sql += `
                AND b.name LIKE ?
            `;

            params.push(`%${business}%`);
        }

        // =========================
        // FILTER ORDER
        // =========================

        if (orderId) {

            sql += `
                AND po.id = ?
            `;

            params.push(orderId);
        }

        // =========================
        // FILTER QR
        // =========================

        if (qr) {

            sql += `
                AND EXISTS (
                    SELECT 1
                    FROM tags_qr_codes q
                    WHERE q.product_id = po.product_id
                    AND q.code LIKE ?
                )
            `;

            params.push(`%${qr}%`);
        }

        sql += `
            ORDER BY po.created_at DESC
        `;

        const [rows] =
            await db.execute(sql, params);

        return Response.json({
            ok: true,
            data: rows
        });

    } catch (err) {

        console.error(err);

        return Response.json(
            {
                ok: false,
                error: "Error producción"
            },
            {
                status: 500
            }
        );
    }
}