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

    await conn.execute(
      `DELETE FROM tags_plans WHERE id = ?`,
      [id]
    );

    conn.release();

    return Response.json({ ok: true });

  } catch (e) {

    console.error("PLAN DELETE ERROR:", e);

    return Response.json(
      { error: "Error eliminando plan" },
      { status: 500 }
    );
  }
}