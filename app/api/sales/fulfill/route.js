import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const {
            sale_item_id
        } = await req.json();

        if (!sale_item_id) {

            return Response.json(
                {
                    error:
                        "sale_item_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        await conn.beginTransaction();

        // =====================================
        // SALE ITEM
        // =====================================

        const [itemRows] =
            await conn.execute(
                `
                SELECT

                    si.*,

                    s.business_id,
                    s.id AS sale_id

                FROM tags_sale_items si

                INNER JOIN tags_sales s
                    ON s.id = si.sale_id

                WHERE si.id = ?

                LIMIT 1
                `,
                [sale_item_id]
            );

        const item =
            itemRows[0];

        if (!item) {

            return Response.json(
                {
                    error:
                        "Item inválido"
                },
                {
                    status: 404
                }
            );
        }

        // =====================================
        // PENDING
        // =====================================

        const pendingQty =
            Number(item.quantity)
            - Number(item.delivered_quantity);

        if (pendingQty <= 0) {

            return Response.json(
                {
                    error:
                        "La venta ya está cumplida"
                },
                {
                    status: 400
                }
            );
        }

        // =====================================
        // AVAILABLE QR
        // =====================================

        const [availableQrs] =
            await conn.execute(
                `
                SELECT
                    id
                FROM tags_qr_codes
                WHERE product_id = ?
                AND status = 'available'
                ORDER BY id ASC
                LIMIT ${pendingQty}
                `,
                [
                    item.product_id
                ]
            );

        if (
            availableQrs.length === 0
        ) {

            return Response.json(
                {
                    error:
                        "No hay stock disponible"
                },
                {
                    status: 400
                }
            );
        }

        // =====================================
        // INSERT RELATIONS
        // =====================================

        for (const qr of availableQrs) {

            await conn.execute(
                `
                INSERT INTO tags_sale_item_qrs
                (
                    sale_item_id,
                    qr_id,
                    created_at
                )
                VALUES
                (
                    ?, ?, NOW()
                )
                `,
                [
                    sale_item_id,
                    qr.id
                ]
            );
        }

        // =====================================
        // UPDATE QR STATUS
        // =====================================

        const placeholders =
            availableQrs
                .map(() => "?")
                .join(",");

        await conn.execute(
            `
            UPDATE tags_qr_codes
            SET
                status = 'assigned',
                business_id = ?
            WHERE id IN (${placeholders})
            `,
            [
                item.business_id,
                ...availableQrs.map(
                    q => q.id
                )
            ]
        );

        // =====================================
        // UPDATE ITEM
        // =====================================

        await conn.execute(
            `
            UPDATE tags_sale_items
            SET delivered_quantity =
                delivered_quantity + ?
            WHERE id = ?
            `,
            [
                availableQrs.length,
                sale_item_id
            ]
        );

        // =====================================
        // RECALC SALE STATUS
        // =====================================

        const [items] =
            await conn.execute(
                `
                SELECT
                    quantity,
                    delivered_quantity
                FROM tags_sale_items
                WHERE sale_id = ?
                `,
                [item.sale_id]
            );

        let total = 0;
        let delivered = 0;

        for (const i of items) {

            total +=
                Number(i.quantity);

            delivered +=
                Number(i.delivered_quantity);
        }

        let status =
            "pending";

        if (delivered > 0) {

            status =
                "partial";
        }

        if (delivered >= total) {

            status =
                "completed";
        }

        await conn.execute(
            `
            UPDATE tags_sales
            SET status = ?
            WHERE id = ?
            `,
            [
                status,
                item.sale_id
            ]
        );

        await conn.commit();

        return Response.json({
            ok: true,
            assigned:
                availableQrs.length,
            status
        });

    } catch (err) {

        await conn.rollback();

        console.error(
            "FULFILL ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error cumpliendo venta"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();
    }
}