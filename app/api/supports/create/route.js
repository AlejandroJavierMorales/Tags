import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {

  try {

    const body = await req.json();

    const {
      name,
      type,
      is_digital
    } = body;

    // =========================
    // VALIDATIONS
    // =========================

    if (!name?.trim()) {

      return Response.json(
        {
          ok: false,
          error: "Nombre requerido"
        },
        {
          status: 400
        }
      );
    }

    if (!type) {

      return Response.json(
        {
          ok: false,
          error: "Tipo requerido"
        },
        {
          status: 400
        }
      );
    }

    // =========================
    // DUPLICATE
    // =========================

    const [duplicateRows] = await db.execute(
      `
      SELECT id
      FROM tags_supports
      WHERE name = ?
      LIMIT 1
      `,
      [name.trim()]
    );

    if (duplicateRows.length) {

      return Response.json(
        {
          ok: false,
          error: "Ya existe un soporte con ese nombre"
        },
        {
          status: 400
        }
      );
    }

    // =========================
    // INSERT
    // =========================

    await db.execute(
      `
      INSERT INTO tags_supports
      (
        name,
        type,
        is_digital
      )
      VALUES (?, ?, ?)
      `,
      [
        name.trim(),
        type,
        is_digital ? 1 : 0
      ]
    );

    return Response.json({
      ok: true,
      message: "Soporte creado correctamente"
    });

  } catch (err) {

    console.error("CREATE SUPPORT ERROR:", err);

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