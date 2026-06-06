import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function POST(req) {

  try {

    const body = await req.json();

    const {
      id,
      name,
      is_digital,
      qr_type_id,
      support_id,
      url_prefix
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

    if (!qr_type_id) {
      return Response.json(
        {
          ok: false,
          error: "Tipo QR requerido"
        },
        {
          status: 400
        }
      );
    }

    if (!support_id) {
      return Response.json(
        {
          ok: false,
          error: "Soporte requerido"
        },
        {
          status: 400
        }
      );
    }

    // =========================
    // VERIFY PRODUCT
    // =========================

    const [productRows] = await db.execute(
      `
      SELECT id, is_digital
      FROM tags_products
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    const product = productRows[0];

    if (!product) {
      return Response.json(
        {
          ok: false,
          error: "Producto no encontrado"
        },
        {
          status: 404
        }
      );
    }

    // =========================
    // VERIFY QR TYPE
    // =========================

    const [qrTypeRows] = await db.execute(
      `
      SELECT id, name
      FROM tags_qr_types
      WHERE id = ?
      LIMIT 1
      `,
      [qr_type_id]
    );

    if (!qrTypeRows.length) {
      return Response.json(
        {
          ok: false,
          error: "Tipo QR inválido"
        },
        {
          status: 400
        }
      );
    }

    // =========================
    // VERIFY SUPPORT
    // =========================

    const [supportRows] = await db.execute(
      `
      SELECT id, name, is_digital
      FROM tags_supports
      WHERE id = ?
      LIMIT 1
      `,
      [support_id]
    );

    if (!supportRows.length) {
      return Response.json(
        {
          ok: false,
          error: "Soporte inválido"
        },
        {
          status: 400
        }
      );
    }

    // =========================
    // DUPLICATE NAME
    // =========================

    const [duplicateRows] = await db.execute(
      `
      SELECT id
      FROM tags_products
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
          error: "Ya existe otro producto con ese nombre"
        },
        {
          status: 400
        }
      );
    }

    // =========================
    // VALIDACIÓN STOCK
    // =========================

    if (is_digital) {

      const [stockRows] = await db.execute(
        `
        SELECT quantity
        FROM tags_stock
        WHERE product_id = ?
        LIMIT 1
        `,
        [id]
      );

      const stock = stockRows[0];

      if (stock && Number(stock.quantity) > 0) {

        return Response.json(
          {
            ok: false,
            error: "No podés convertir a digital con stock existente"
          },
          {
            status: 400
          }
        );
      }
    }

    // =========================
    // UPDATE
    // =========================

    await db.execute(
      `
      UPDATE tags_products
      SET
        name = ?,
        is_digital = ?,
        qr_type_id = ?,
        support_id = ?,
        url_prefix = ?
      WHERE id = ?
      `,
      [
        name.trim(),
        is_digital ? 1 : 0,
        qr_type_id,
        support_id,
        url_prefix,
        id
      ]
    );

    // =========================
    // RESPONSE
    // =========================

    return Response.json({
      ok: true,
      message: "Producto actualizado correctamente"
    });

  } catch (err) {

    console.error("UPDATE PRODUCT ERROR:", err);

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