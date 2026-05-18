import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST(req) {

  try {

    const body = await req.json();

    const {
      id,
      name,
      type,
      is_digital
    } = body;

    // =========================
    // VALIDATIONS
    // =========================

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
    // VERIFY
    // =========================

    const [supportRows] = await db.execute(
      `
      SELECT id
      FROM tags_supports
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!supportRows.length) {

      return Response.json(
        {
          ok: false,
          error: "Soporte no encontrado"
        },
        {
          status: 404
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
      AND id != ?
      LIMIT 1
      `,
      [
        name.trim(),
        id
      ]
    );

    if (duplicateRows.length) {

      return Response.json(
        {
          ok: false,
          error: "Ya existe otro soporte con ese nombre"
        },
        {
          status: 400
        }
      );
    }

    // =========================
    // UPDATE
    // =========================

    await db.execute(
      `
      UPDATE tags_supports
      SET
        name = ?,
        type = ?,
        is_digital = ?
      WHERE id = ?
      `,
      [
        name.trim(),
        type,
        is_digital ? 1 : 0,
        id
      ]
    );

    return Response.json({
      ok: true,
      message: "Soporte actualizado correctamente"
    });

  } catch (err) {

    console.error("UPDATE SUPPORT ERROR:", err);

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