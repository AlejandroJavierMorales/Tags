import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    const conn = await db.getConnection();

    try {

        const body =
            await req.json();

        const business_id =
            body.business_id;

        const items =
            body.items;

        const notes =
            body.notes;

        // =====================================
        // VALIDATIONS
        // =====================================

        if (!business_id) {

            return Response.json(
                {
                    error: "Cliente requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (
            !Array.isArray(items)
            || items.length === 0
        ) {

            return Response.json(
                {
                    error: "Items requeridos"
                },
                {
                    status: 400
                }
            );
        }

        await conn.beginTransaction();

        // =====================================
        // CREATE SALE
        // =====================================

        const [saleInsert] =
            await conn.execute(
                `
                INSERT INTO tags_sales
                (
                    business_id,
                    status,
                    notes,
                    created_at
                )
                VALUES
                (
                    ?,
                    'pending',
                    ?,
                    NOW()
                )
                `,
                [
                    business_id,
                    notes || null
                ]
            );

        const saleId =
            saleInsert.insertId;

        let totalQty = 0;

        let assignedQty = 0;

        // =====================================
        // PROCESS ITEMS
        // =====================================

        for (const item of items) {

            const productId =
                Number(item.product_id);

            const quantity =
                Number(item.quantity);

            totalQty += quantity;

            // =====================================
            // GET AVAILABLE QR
            // =====================================

            const [availableQrs] =
                await conn.execute(
                    `
                    SELECT
                        id,
                        code
                    FROM tags_qr_codes
                    WHERE product_id = ?
                    AND status = 'available'
                    ORDER BY id ASC
                    LIMIT ${quantity}
                    `,
                    [
                        productId
                    ]
                );

            const availableQty =
                availableQrs.length;

            assignedQty += availableQty;

            const missingQty =
                Math.max(
                    0,
                    quantity - availableQty
                );

            // =====================================
            // CREATE SALE ITEM
            // =====================================

            const [saleItemInsert] =
                await conn.execute(
                    `
                    INSERT INTO tags_sale_items
                    (
                        sale_id,
                        product_id,
                        quantity,
                        delivered_quantity,
                        created_at
                    )
                    VALUES
                    (
                        ?, ?, ?, ?, NOW()
                    )
                    `,
                    [
                        saleId,
                        productId,
                        quantity,
                        availableQty
                    ]
                );

            const saleItemId =
                saleItemInsert.insertId;

            // =====================================
            // LINK ASSIGNED QR
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
                        saleItemId,
                        qr.id
                    ]
                );
            }

            // =====================================
            // UPDATE AVAILABLE QR
            // =====================================

            if (availableQrs.length > 0) {

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
                        business_id,
                        ...availableQrs.map(
                            q => q.id
                        )
                    ]
                );
            }

            // =====================================
            // CREATE PRODUCTION ORDER
            // =====================================

            if (missingQty > 0) {

                // =====================================
                // GET GENERATED QR
                // =====================================

                const [generatedQrs] =
                    await conn.execute(
                        `
                        SELECT
                            id,
                            code
                        FROM tags_qr_codes
                        WHERE product_id = ?
                        AND status = 'generated'
                        AND production_order_id IS NULL
                        ORDER BY id ASC
                        LIMIT ${missingQty}
                        `,
                        [
                            productId
                        ]
                    );

                // =====================================
                // VALIDATE GENERATED
                // =====================================

                if (generatedQrs.length < missingQty) {

                    throw new Error(
                        `No hay suficientes QR generated para producto ${productId}`
                    );
                }

                // =====================================
                // NOTES
                // =====================================

                const qrCodesText =
                    generatedQrs
                        .map(q => q.code)
                        .join(", ");

                // =====================================
                // CREATE OP
                // =====================================

                const [productionInsert] =
                    await conn.execute(
                        `
                        INSERT INTO tags_production_orders
                        (
                            sale_id,
                            sale_item_id,
                            product_id,
                            business_id,
                            quantity,
                            produced_quantity,
                            status,
                            notes,
                            created_at
                        )
                        VALUES
                        (
                            ?, ?, ?, ?, ?, 0,
                            'pending',
                            ?,
                            NOW()
                        )
                        `,
                        [
                            saleId,
                            saleItemId,
                            productId,
                            business_id,
                            missingQty,
                            `Auto generada desde venta #${saleId}. QR: ${qrCodesText}`
                        ]
                    );

                const productionOrderId =
                    productionInsert.insertId;

                // =====================================
                // LINK QR TO OP
                // =====================================

                const generatedPlaceholders =
                    generatedQrs
                        .map(() => "?")
                        .join(",");

                await conn.execute(
                    `
                    UPDATE tags_qr_codes
                    SET production_order_id = ?
                    WHERE id IN (${generatedPlaceholders})
                    `,
                    [
                        productionOrderId,
                        ...generatedQrs.map(
                            q => q.id
                        )
                    ]
                );
            }
        }

        // =====================================
        // FINAL STATUS
        // =====================================

        let finalStatus =
            "pending";

        if (assignedQty > 0) {

            finalStatus =
                "partial";
        }

        if (assignedQty >= totalQty) {

            finalStatus =
                "completed";
        }

        // =====================================
        // UPDATE SALE
        // =====================================

        await conn.execute(
            `
            UPDATE tags_sales
            SET status = ?
            WHERE id = ?
            `,
            [
                finalStatus,
                saleId
            ]
        );

        await conn.commit();

        return Response.json({
            ok: true,
            id: saleId,
            status: finalStatus
        });

    } catch (err) {

        await conn.rollback();

        console.error(
            "CREATE SALE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error creando venta"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();
    }
}