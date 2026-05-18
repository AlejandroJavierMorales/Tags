import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const {
            sale_item_id,
            qr_ids
        } = await req.json();

        if (
            !sale_item_id
            || !Array.isArray(qr_ids)
            || qr_ids.length === 0
        ) {

            return Response.json(
                {
                    error:
                        "Datos inválidos"
                },
                {
                    status: 400
                }
            );
        }

        await conn.beginTransaction();

        // =========================
        // ITEM
        // =========================

        const [itemRows] =
            await conn.execute(
                `
                SELECT
                    si.*,
                    s.business_id
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

        // =========================
        // VALIDATE QRS
        // =========================

        const placeholders =
            qr_ids.map(() => "?")
                .join(",");

        const [qrRows] =
            await conn.execute(
                `
                SELECT id
                FROM tags_qr_codes
                WHERE id IN (${placeholders})
                AND status = 'available'
                AND product_id = ?
                `,
                [
                    ...qr_ids,
                    item.product_id
                ]
            );

        if (
            qrRows.length
            !== qr_ids.length
        ) {

            return Response.json(
                {
                    error:
                        "QR inválido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // INSERT RELATIONS
        // =========================

        for (const qrId of qr_ids) {

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
                    qrId
                ]
            );
        }

        // =========================
        // UPDATE QR
        // =========================

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
                ...qr_ids
            ]
        );

        // =========================
        // UPDATE ITEM
        // =========================

        await conn.execute(
            `
            UPDATE tags_sale_items
            SET delivered_quantity =
                delivered_quantity + ?
            WHERE id = ?
            `,
            [
                qr_ids.length,
                sale_item_id
            ]
        );

        // =========================
        // RECALC STATUS
        // =========================

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

            total += i.quantity;
            delivered +=
                i.delivered_quantity;
        }

        let status = "pending";

        if (delivered > 0) {
            status = "partial";
        }

        if (delivered >= total) {
            status = "completed";
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
            ok: true
        });

    } catch (err) {

        await conn.rollback();

        console.error(
            "DELIVER ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error entregando"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();
    }
}