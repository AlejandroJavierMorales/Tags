import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    const conn = await db.getConnection();

    try {

        const {
            product_id,
            business_id,
            selected_qrs,
            notes
        } = await req.json();

        // =========================
        // VALIDATIONS
        // =========================

        if (!product_id) {

            return Response.json(
                { error: "Producto requerido" },
                { status: 400 }
            );
        }

        if (
            !selected_qrs
            || !Array.isArray(selected_qrs)
            || selected_qrs.length === 0
        ) {

            return Response.json(
                { error: "Debes seleccionar al menos 1 QR" },
                { status: 400 }
            );
        }

        // =========================
        // PRODUCT
        // =========================

        const [productRows] = await conn.execute(
            `
            SELECT id, is_digital
            FROM tags_products
            WHERE id = ?
            LIMIT 1
            `,
            [product_id]
        );

        const product = productRows[0];

        if (!product) {

            return Response.json(
                { error: "Producto inválido" },
                { status: 404 }
            );
        }

        // =========================
        // NO DIGITAL
        // =========================

        if (product.is_digital) {

            return Response.json(
                {
                    error:
                        "Los productos digitales no requieren producción"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // BUSINESS
        // =========================

        if (business_id) {

            const [businessRows] = await conn.execute(
                `
                SELECT id
                FROM tags_businesses
                WHERE id = ?
                LIMIT 1
                `,
                [business_id]
            );

            if (!businessRows[0]) {

                return Response.json(
                    { error: "Cliente inválido" },
                    { status: 404 }
                );
            }
        }

        // =========================
        // BEGIN TRANSACTION
        // =========================

        await conn.beginTransaction();

        // =========================
        // GET SELECTED QRs
        // =========================

        const placeholders =
            selected_qrs.map(() => "?").join(",");

        const [generatedRows] = await conn.execute(
            `
            SELECT
                id,
                code
            FROM tags_qr_codes
            WHERE id IN (${placeholders})
            AND product_id = ?
            AND status = 'generated'
            AND production_order_id IS NULL
            `,
            [
                ...selected_qrs,
                product_id
            ]
        );

        if (generatedRows.length === 0) {

            await conn.rollback();

            return Response.json(
                {
                    error:
                        "Los QRs seleccionados no son válidos"
                },
                {
                    status: 400
                }
            );
        }

        const qrIds =
            generatedRows.map(q => q.id);

        const qrCodes =
            generatedRows.map(q => q.code);

        const quantity =
            qrIds.length;

        // =========================
        // BUILD NOTES
        // =========================

        const qrText =
            `QRs asociados:\n${qrCodes.join("\n")}`;

        const finalNotes =
            notes
                ? `${notes}\n\n${qrText}`
                : qrText;

        // =========================
        // CREATE ORDER
        // =========================

        const [insert] = await conn.execute(
            `
            INSERT INTO tags_production_orders
            (
                product_id,
                business_id,
                quantity,
                notes,
                status,
                created_at
            )
            VALUES (?, ?, ?, ?, 'pending', NOW())
            `,
            [
                product_id,
                business_id || null,
                quantity,
                finalNotes
            ]
        );

        const orderId =
            insert.insertId;

        // =========================
        // LINK QRs
        // =========================

        const qrPlaceholders =
            qrIds.map(() => "?").join(",");

        await conn.execute(
            `
            UPDATE tags_qr_codes
            SET production_order_id = ?
            WHERE id IN (${qrPlaceholders})
            `,
            [
                orderId,
                ...qrIds
            ]
        );

        // =========================
        // COMMIT
        // =========================

        await conn.commit();

        return Response.json({
            ok: true,
            id: orderId,
            quantity,
            qr_codes: qrCodes
        });

    } catch (err) {

        await conn.rollback();

        console.error(
            "CREATE PRODUCTION ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error creando orden"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();
    }
}