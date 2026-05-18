import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const product =
            searchParams.get("product") || "";

        const status =
            searchParams.get("status") || "";

        let where =
            "WHERE 1 = 1";

        const params = [];

        // =====================================
        // PRODUCT FILTER
        // =====================================

        if (product) {

            where += `
                AND p.name LIKE ?
            `;

            params.push(
                `%${product}%`
            );
        }

        // =====================================
        // STATUS FILTER
        // =====================================

        if (status === "ok") {

            where += `
                AND (
                    COALESCE(stock.quantity, 0)
                    -
                    COALESCE(sold.assigned, 0)
                ) > 0
            `;
        }

        if (status === "empty") {

            where += `
                AND (
                    COALESCE(stock.quantity, 0)
                    -
                    COALESCE(sold.assigned, 0)
                ) <= 0
            `;
        }

        if (status === "digital") {

            where += `
                AND p.is_digital = 1
            `;
        }

        // =====================================
        // QUERY
        // =====================================

        const [rows] =
            await db.execute(
                `
                SELECT

                    p.id,
                    p.name,
                    p.is_digital,

                    COALESCE(
                        stock.quantity,
                        0
                    ) AS stock,

                    COALESCE(
                        sold.assigned,
                        0
                    ) AS assigned,

                    COALESCE(
                        generated_qr.generated_qty,
                        0
                    ) AS generated_qty,

                    COALESCE(
                        available_qr.available_qty,
                        0
                    ) AS available_qty,

                    (
                        COALESCE(stock.quantity, 0)
                        -
                        COALESCE(sold.assigned, 0)
                    ) AS real_stock

                FROM tags_products p

                LEFT JOIN tags_stock stock
                    ON stock.product_id = p.id

                LEFT JOIN (

                    SELECT
                        product_id,
                        COUNT(*) AS assigned

                    FROM tags_qr_codes

                    WHERE status = 'assigned'

                    GROUP BY product_id

                ) sold
                    ON sold.product_id = p.id

                LEFT JOIN (

                    SELECT
                        product_id,
                        COUNT(*) AS generated_qty

                    FROM tags_qr_codes

                    WHERE status = 'generated'

                    GROUP BY product_id

                ) generated_qr
                    ON generated_qr.product_id = p.id

                LEFT JOIN (

                    SELECT
                        product_id,
                        COUNT(*) AS available_qty

                    FROM tags_qr_codes

                    WHERE status = 'available'

                    GROUP BY product_id

                ) available_qr
                    ON available_qr.product_id = p.id

                ${where}

                ORDER BY p.name ASC
                `,
                params
            );

        return Response.json({
            ok: true,
            products: rows
        });

    } catch (err) {

        console.error(
            "STOCK GET ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error stock",
                products: []
            },
            {
                status: 500
            }
        );
    }
}