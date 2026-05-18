import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================================
// GET
// =====================================

export async function GET() {

  const [rows] =
    await db.execute(
      `
      SELECT *
      FROM tags_qr_types
      ORDER BY id DESC
      `
    );

  return Response.json({
    data: rows
  });
}

// =====================================
// POST
// =====================================

export async function POST(req) {

  const {
    name,
    code,
    url_prefix
  } = await req.json();

  await db.execute(
    `
    INSERT INTO tags_qr_types
    (
      name,
      code,
      url_prefix
    )
    VALUES (?, ?, ?)
    `,
    [
      name,
      code,
      url_prefix || null
    ]
  );

  return Response.json({
    ok: true
  });
}

// =====================================
// PUT
// =====================================

export async function PUT(req) {

  const {
    id,
    name,
    code,
    url_prefix
  } = await req.json();

  await db.execute(
    `
    UPDATE tags_qr_types
    SET
      name = ?,
      code = ?,
      url_prefix = ?
    WHERE id = ?
    `,
    [
      name,
      code,
      url_prefix || null,
      id
    ]
  );

  return Response.json({
    ok: true
  });
}

// =====================================
// DELETE
// =====================================

export async function DELETE(req) {

  try {

    const { id } =
      await req.json();

    // =====================================
    // VALIDATION
    // =====================================

    if (!id) {

      return Response.json(
        {
          error: "Falta id"
        },
        {
          status: 400
        }
      );
    }

    // =====================================
    // CHECK PRODUCTS USING TYPE
    // =====================================

    const [rows] =
      await db.execute(
        `
        SELECT COUNT(*) as total
        FROM tags_products
        WHERE qr_type_id = ?
        `,
        [id]
      );

    const total =
      rows[0]?.total || 0;

    // =====================================
    // BLOCK DELETE
    // =====================================

    if (total > 0) {

      return Response.json(
        {
          error:
            "No se puede eliminar - existen productos usando este tipo",
          inUse: true,
          count: total
        },
        {
          status: 400
        }
      );
    }

    // =====================================
    // DELETE
    // =====================================

    await db.execute(
      `
      DELETE FROM tags_qr_types
      WHERE id = ?
      `,
      [id]
    );

    return Response.json({
      ok: true,
      message:
        "Tipo eliminado correctamente"
    });

  } catch (error) {

    console.log(
      "DELETE QR TYPE ERROR:",
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          "Error interno"
      },
      {
        status: 500
      }
    );
  }
}