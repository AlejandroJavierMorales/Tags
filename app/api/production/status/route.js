import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {
  const conn = await db.getConnection();

  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return Response.json(
        { error: "Faltan datos" },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    // 🔍 traer orden
    const [rows] = await conn.execute(
      `SELECT * FROM tags_production_orders WHERE id = ? FOR UPDATE`,
      [id]
    );

    const order = rows[0];

    if (!order) {
      return Response.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // ❗ evitar duplicar stock
    if (order.status === "done") {
      return Response.json(
        { error: "La orden ya fue completada" },
        { status: 400 }
      );
    }

    // 🔄 actualizar estado
    await conn.execute(
      `UPDATE tags_production_orders SET status = ? WHERE id = ?`,
      [status, id]
    );

    // ✅ si pasa a DONE → sumar stock
    if (status === "done") {
      await conn.execute(`
        INSERT INTO tags_stock (product_id, quantity)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
        quantity = quantity + ?
      `, [
        order.product_id,
        order.quantity,
        order.quantity
      ]);
      // ✅ pasar QR generated -> available
      await conn.execute(
        `
        UPDATE tags_qr_codes
        SET status = 'available'
        WHERE production_order_id = ?
        AND status = 'generated'
        `,
        [id]
      );
    }

    await conn.commit();

    return Response.json({ ok: true });

  } catch (err) {

    await conn.rollback();

    console.error("PRODUCTION STATUS ERROR:", err);

    return Response.json(
      { error: "Error actualizando producción" },
      { status: 500 }
    );

  } finally {
    conn.release();
  }
}