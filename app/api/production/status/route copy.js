import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {
    const conn = await db.getConnection();

    try {
        const { id, status } = await req.json();

        // =========================
        // 🔒 VALIDACIONES
        // =========================
        if (!id || !status) {
            return Response.json(
                { error: "Faltan datos" },
                { status: 400 }
            );
        }

        await conn.beginTransaction();

        // =========================
        // 🔍 TRAER ORDEN CON LOCK
        // =========================
        const [rows] = await conn.execute(
            `SELECT * FROM tags_production_orders WHERE id = ? FOR UPDATE`,
            [id]
        );

        const order = rows[0];

        if (!order) {
            await conn.rollback();
            return Response.json(
                { error: "Orden no encontrada" },
                { status: 404 }
            );
        }

        // =========================
        // 🔥 SI PASA A DONE → SUMAR STOCK
        // =========================
        if (status === "done" && order.status !== "done") {

            // 🔒 LOCK stock
            const [stockRows] = await conn.execute(
                `SELECT quantity FROM tags_stock WHERE product_id = ? FOR UPDATE`,
                [order.product_id]
            );

            if (!stockRows[0]) {
                // no existe → crear
                await conn.execute(
                    `INSERT INTO tags_stock (product_id, quantity) VALUES (?, ?)`,
                    [order.product_id, order.quantity]
                );
            } else {
                // existe → sumar
                await conn.execute(
                    `UPDATE tags_stock SET quantity = quantity + ? WHERE product_id = ?`,
                    [order.quantity, order.product_id]
                );
            }
        }

        // =========================
        // 🧠 UPDATE STATUS
        // =========================
        await conn.execute(
            `UPDATE tags_production_orders SET status = ? WHERE id = ?`,
            [status, id]
        );

        // =========================
        // ✅ COMMIT
        // =========================
        await conn.commit();

        return Response.json({ ok: true });

    } catch (err) {

        await conn.rollback();

        console.error("UPDATE PRODUCTION ERROR:", err);

        return Response.json(
            { error: "Error actualizando orden" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}