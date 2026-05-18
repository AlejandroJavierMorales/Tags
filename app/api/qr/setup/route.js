import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



async function getOrCreateBusiness(email, name, phone) {
  const [rows] = await db.execute(
    "SELECT id FROM tags_businesses WHERE email = ?",
    [email]
  );

  if (rows.length > 0) return rows[0].id;

  const [result] = await db.execute(
    "INSERT INTO tags_businesses (email, name, phone) VALUES (?, ?, ?)",
    [email, name || email, phone || null]
  );

  return result.insertId;
}

export async function POST(req) {
  try {
    const {
      code,
      value,
      label,
      email,
      phone,
      name
    } = await req.json();

    // =========================
    // 🔒 VALIDACIONES
    // =========================
    if (!code || !value || !email) {
      return Response.json(
        { error: "Faltan datos" },
        { status: 400 }
      );
    }

    // =========================
    // 🔍 TRAER QR
    // =========================
    const [qrRows] = await db.execute(
      "SELECT * FROM tags_qr_codes WHERE code = ?",
      [code]
    );

    const qr = qrRows[0];

    if (!qr) {
      return Response.json(
        { error: "QR no encontrado" },
        { status: 404 }
      );
    }

    // =========================
    // 🔍 TRAER PRODUCTO
    // =========================
    const [productRows] = await db.execute(
      "SELECT * FROM tags_products WHERE id = ?",
      [qr.product_id]
    );

    const product = productRows[0];

    if (!product) {
      return Response.json(
        { error: "Producto inválido" },
        { status: 400 }
      );
    }

    // =========================
    // 👤 BUSINESS
    // =========================
    const business_id = await getOrCreateBusiness(email, name, phone);

    // =========================
    // 🔗 GENERAR FINAL URL (AHORA DESDE PRODUCTO)
    // =========================
    let finalUrl = value;

    if (product.url_prefix) {
      finalUrl = product.url_prefix + value;
    }

    // =========================
    // 💾 UPDATE QR
    // =========================
    await db.execute(
      `
      UPDATE tags_qr_codes
      SET 
        label = ?,
        value = ?,
        final_url = ?,
        email = ?,
        business_id = ?,
        status = 'active'
      WHERE code = ?
      `,
      [
        label || null,
        value,
        finalUrl,
        email,
        business_id,
        code,
      ]
    );

    // =========================
    // ✅ RESPONSE
    // =========================
    return Response.json({
      ok: true,
      final_url: finalUrl,
      status: "active",
      business_id
    });

  } catch (error) {
    console.error("SETUP QR ERROR:", error);

    return Response.json(
      { error: "Error guardando QR" },
      { status: 500 }
    );
  }
}