// =====================================
// API: /api/plans/delete
// Descripción: Elimina un plan solo si no tiene clientes ni suscripciones asociadas.
// =====================================

import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req) {

  const conn = await db.getConnection();

  try {

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json(
        { error: "ID requerido" },
        { status: 400 }
      );
    }

    const [businessRows] = await conn.execute(
      `
      SELECT id
      FROM tags_businesses
      WHERE plan_id = ?
      LIMIT 1
      `,
      [id]
    );

    if (businessRows.length) {
      return Response.json(
        { error: "No se puede eliminar: hay clientes usando este plan" },
        { status: 409 }
      );
    }

    const [subscriptionRows] = await conn.execute(
      `
      SELECT id
      FROM tags_subscriptions
      WHERE plan_id = ?
      LIMIT 1
      `,
      [id]
    );

    if (subscriptionRows.length) {
      return Response.json(
        { error: "No se puede eliminar: hay suscripciones asociadas a este plan" },
        { status: 409 }
      );
    }

    await conn.execute(
      `
      UPDATE tags_plans
        SET is_active = 0,
            is_public = 0
        WHERE id = ?
      `,
      [id]
    );

    return Response.json({ ok: true });

  } catch (e) {

    console.error("PLAN DELETE ERROR:", e);

    return Response.json(
      { error: "Error eliminando plan" },
      { status: 500 }
    );

  } finally {
    conn.release();
  }
}