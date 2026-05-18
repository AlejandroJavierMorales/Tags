import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const {
            order_id
        } = await req.json();

        await conn.beginTransaction();

        // =====================================
        // ORDER
        // =====================================

        const [rows] =
            await conn.execute(
                `
                SELECT *
                FROM tags_production_orders
                WHERE id = ?
                LIMIT 1
                `,
                [order_id]
            );

        const order =
            rows[0];

        if (!order) {

            return Response.json(
                {
                    error:
                        "Orden no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        // =====================================
        // ALREADY DONE
        // =====================================

        if (order.status === "done") {

            return Response.json(
                {
                    error:
                        "La orden ya fue completada"
                },
                {
                    status: 400
                }
            );
        }

        // =====================================
        // STOCK +
        // =====================================

        await conn.execute(
            `
            INSERT INTO tags_stock
            (
                product_id,
                quantity
            )
            VALUES
            (
                ?, ?
            )
            ON DUPLICATE KEY UPDATE
            quantity = quantity + ?
            `,
            [
                order.product_id,
                order.quantity,
                order.quantity
            ]
        );

        // =====================================
        // QR GENERATED -> AVAILABLE
        // =====================================

        const [generatedQrs] =
            await conn.execute(
                `
                SELECT
                    id
                FROM tags_qr_codes
                WHERE production_order_id = ?
                AND status = 'generated'
                ORDER BY id ASC
                `,
                [
                    order.id
                ]
            );

        if (generatedQrs.length > 0) {

            const placeholders =
                generatedQrs
                    .map(() => "?")
                    .join(",");

            await conn.execute(
                `
                UPDATE tags_qr_codes
                SET
                    status = 'available'
                WHERE id IN (${placeholders})
                `,
                generatedQrs.map(
                    q => q.id
                )
            );
        }

        // =====================================
        // MARK DONE
        // =====================================

        await conn.execute(
            `
            UPDATE tags_production_orders
            SET
                status = 'done',
                produced_quantity = quantity
            WHERE id = ?
            `,
            [
                order.id
            ]
        );

        // =====================================
        // AUTO FULFILL SALES
        // =====================================

        // ventas pendientes
        const [pendingItems] =
            await conn.execute(
                `
                SELECT
                    si.id,
                    si.sale_id,
                    si.product_id,
                    si.quantity,
                    si.delivered_quantity,
                    s.business_id
                FROM tags_sale_items si

                INNER JOIN tags_sales s
                    ON s.id = si.sale_id

                WHERE si.product_id = ?
                AND si.delivered_quantity < si.quantity

                ORDER BY si.id ASC
                `,
                [
                    order.product_id
                ]
            );

        // QR disponibles
        const [availableQrs] =
            await conn.execute(
                `
                SELECT
                    id
                FROM tags_qr_codes
                WHERE product_id = ?
                AND status = 'available'
                ORDER BY id ASC
                `,
                [
                    order.product_id
                ]
            );

        let qrIndex = 0;

        for (const item of pendingItems) {

            const missingQty =
                item.quantity
                - item.delivered_quantity;

            if (missingQty <= 0) {
                continue;
            }

            const assignQty =
                Math.min(
                    missingQty,
                    availableQrs.length - qrIndex
                );

            if (assignQty <= 0) {
                break;
            }

            const qrsToAssign =
                availableQrs.slice(
                    qrIndex,
                    qrIndex + assignQty
                );

            qrIndex += assignQty;

            // =========================
            // RELATIONS
            // =========================

            for (const qr of qrsToAssign) {

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
                        item.id,
                        qr.id
                    ]
                );
            }

            // =========================
            // UPDATE QR
            // =========================

            const placeholders =
                qrsToAssign
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
                    ...qrsToAssign.map(
                        q => q.id
                    )
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
                    assignQty,
                    item.id
                ]
            );

            // =========================
            // RECALC SALE
            // =========================

            const [saleItems] =
                await conn.execute(
                    `
                    SELECT
                        quantity,
                        delivered_quantity
                    FROM tags_sale_items
                    WHERE sale_id = ?
                    `,
                    [
                        item.sale_id
                    ]
                );

            let total = 0;
            let delivered = 0;

            for (const s of saleItems) {

                total +=
                    s.quantity;

                delivered +=
                    s.delivered_quantity;
            }

            let saleStatus =
                "pending";

            if (delivered > 0) {
                saleStatus =
                    "partial";
            }

            if (delivered >= total) {
                saleStatus =
                    "completed";
            }

            await conn.execute(
                `
                UPDATE tags_sales
                SET status = ?
                WHERE id = ?
                `,
                [
                    saleStatus,
                    item.sale_id
                ]
            );
        }

        await conn.commit();

        return Response.json({
            ok: true
        });

    } catch (err) {

        await conn.rollback();

        console.error(
            "COMPLETE ORDER ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error completando orden"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();
    }
}