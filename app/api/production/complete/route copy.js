import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {
  try {
    const { order_id } = await req.json();

    const [rows] = await db.execute(
      "SELECT * FROM tags_production_orders WHERE id = ?",
      [order_id]
    );

    const order = rows[0];

    if (!order) {
      return Response.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    // ✅ sumar stock
    await db.execute(`
      INSERT INTO tags_stock (product_id, quantity)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
      quantity = quantity + ?
    `, [order.product_id, order.quantity, order.quantity]);

    // ✅ marcar como done
    await db.execute(`
      UPDATE tags_production_orders
      SET status = 'done'
      WHERE id = ?
    `, [order_id]);

    return Response.json({ ok: true });

  } catch (err) {
    console.error(err);
    return Response.json({ error: "Error" }, { status: 500 });
  }
}