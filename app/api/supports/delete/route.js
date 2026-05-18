import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {

  try {

    const { id } = await req.json();

    if (!id) {

      return Response.json(
        {
          ok: false,
          error: "Falta id"
        },
        {
          status: 400
        }
      );
    }

    // =========================
    // VERIFY USAGE
    // =========================

    const [productsRows] = await db.execute(
      `
      SELECT id
      FROM tags_products
      WHERE support_id = ?
      LIMIT 1
      `,
      [id]
    );

    if (productsRows.length) {

      return Response.json(
        {
          ok: false,
          error: "No podés eliminar un soporte usado por productos"
        },
        {
          status: 400
        }
      );
    }

    // =========================
    // DELETE
    // =========================

    await db.execute(
      `
      DELETE FROM tags_supports
      WHERE id = ?
      `,
      [id]
    );

    return Response.json({
      ok: true
    });

  } catch (err) {

    console.error("DELETE SUPPORT ERROR:", err);

    return Response.json(
      {
        ok: false,
        error: err.message || "Internal server error"
      },
      {
        status: 500
      }
    );
  }
}