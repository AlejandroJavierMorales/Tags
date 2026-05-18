import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const business =
            searchParams.get("business");

        const product =
            searchParams.get("product");

        const status =
            searchParams.get("status");

        let where = `WHERE 1=1`;

        const params = [];

        // =====================================
        // CLIENT FILTER
        // =====================================

        if (business) {

            where += `
                AND b.name LIKE ?
            `;

            params.push(
                `%${business}%`
            );
        }

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
        // PRODUCTION STATUS FILTER
        // =====================================

        if (status) {

            where += `
                AND po.status = ?
            `;

            params.push(status);
        }

        // =====================================
        // QUERY
        // =====================================

        const [rows] =
            await db.execute(
                `
                SELECT

                    si.id AS sale_item_id,

                    s.id AS sale_id,
                    s.status AS sale_status,
                    s.created_at,

                    b.name AS business_name,

                    p.name AS product_name,

                    si.quantity,
                    si.delivered_quantity,

                    (
                        si.quantity
                        - si.delivered_quantity
                    ) AS pending_quantity,

                    po.id AS production_order_id,
                    po.status AS production_status,

                    stock.quantity AS stock_quantity

                FROM tags_sale_items si

                INNER JOIN tags_sales s
                    ON s.id = si.sale_id

                INNER JOIN tags_products p
                    ON p.id = si.product_id

                LEFT JOIN tags_businesses b
                    ON b.id = s.business_id

                LEFT JOIN tags_production_orders po
                    ON po.sale_item_id = si.id

                LEFT JOIN tags_stock stock
                    ON stock.product_id = si.product_id

                ${where}

                ORDER BY

                    CASE
                        WHEN si.delivered_quantity < si.quantity
                        THEN 0
                        ELSE 1
                    END,

                    s.created_at ASC
                `,
                params
            );

        return Response.json({
            ok: true,
            data: rows
        });

    } catch (err) {

        console.error(
            "BACKORDERS ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error obteniendo backorders",
                data: []
            },
            {
                status: 500
            }
        );
    }
}