import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const saleId =
            searchParams.get("id");

        if (!saleId) {

            return Response.json(
                {
                    error: "ID requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =====================================
        // SALE
        // =====================================

        const [saleRows] =
            await db.execute(
                `
                SELECT
                    s.*,
                    b.name AS business_name
                FROM tags_sales s

                LEFT JOIN tags_businesses b
                    ON b.id = s.business_id

                WHERE s.id = ?
                LIMIT 1
                `,
                [saleId]
            );

        const sale =
            saleRows[0];

        if (!sale) {

            return Response.json(
                {
                    error: "Venta no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        // =====================================
        // ITEMS
        // =====================================

        const [items] =
            await db.execute(
                `
                SELECT
                    si.*,
                    p.name AS product_name
                FROM tags_sale_items si

                LEFT JOIN tags_products p
                    ON p.id = si.product_id

                WHERE si.sale_id = ?
                ORDER BY si.id ASC
                `,
                [saleId]
            );

        // =====================================
        // QR + OP
        // =====================================

        for (const item of items) {

            // ===============================
            // QR
            // ===============================

            const [qrs] =
                await db.execute(
                    `
                    SELECT
                        q.id,
                        q.code,
                        q.status,
                        q.production_order_id
                    FROM tags_sale_item_qrs sq

                    INNER JOIN tags_qr_codes q
                        ON q.id = sq.qr_id

                    WHERE sq.sale_item_id = ?
                    `,
                    [item.id]
                );

            item.qrs = qrs;

            // ===============================
            // OP
            // ===============================

            const [ops] =
                await db.execute(
                    `
                SELECT
                    id,
                    quantity,
                    produced_quantity,
                    status,
                    notes,
                    created_at
                FROM tags_production_orders
                WHERE sale_item_id = ?
                ORDER BY id DESC
                `,
                    [
                        item.id
                    ]
                );

            item.production_orders =
                ops;
        }

        sale.items = items;

        return Response.json({
            ok: true,
            data: sale
        });

    } catch (err) {

        console.error(
            "SALE DETAIL ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error obteniendo detalle"
            },
            {
                status: 500
            }
        );
    }
}