import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function POST(req) {
  const conn = await db.getConnection();

  try {
    const {
      label,
      business_id,
      product_id,
      quantity = 1
    } = await req.json();

    // =========================
    // 🔒 VALIDACIONES
    // =========================


    if (!product_id) {
      return Response.json({ error: "Producto requerido" }, { status: 400 });
    }

    if (quantity < 1 || quantity > 100) {
      return Response.json(
        { error: "Cantidad inválida (1-100)" },
        { status: 400 }
      );
    }



    // =========================
    // 🔍 VALIDAR CLIENTE
    // =========================
    if (business_id) {
      const [bRows] = await conn.execute(
        "SELECT id FROM tags_businesses WHERE id = ?",
        [business_id]
      );

      if (!bRows[0]) {
        return Response.json(
          { error: "Cliente inválido" },
          { status: 400 }
        );
      }
    }




    // =========================
    // 🔍 VALIDAR PRODUCTO
    // =========================
    const [productRows] = await conn.execute(
      "SELECT * FROM tags_products WHERE id = ?",
      [product_id]
    );

    const product = productRows[0];

    if (!product) {
      return Response.json(
        { error: "Producto inválido" },
        { status: 400 }
      );
    }

    // =========================
    // 🚨 INICIAR TRANSACCIÓN
    // =========================
    await conn.beginTransaction();

    // =========================
    // 🧠 STATUS
    // =========================
    let status = "generated";

    if (product.is_digital) {

      status = business_id
        ? "assigned"
        : "available";
    } //QR que se crea es QR generated siempre que no sea Digital


    // =========================
    // 🧠 DIGITAL
    // =========================

    // Los digitales sí pueden quedar activos/asignados
    // porque no dependen de producción física

    if (product.is_digital && business_id) {

      stockBefore = 0;
      stockAfter = 0;
    }

    // =========================
    // 🔳 CREAR QRs
    // =========================
    const codes = [];

    for (let i = 0; i < quantity; i++) {

      let code;
      let exists = true;

      // 🔁 asegurar código único
      while (exists) {
        code = generateCode();

        const [check] = await conn.execute(
          "SELECT id FROM tags_qr_codes WHERE code = ? LIMIT 1",
          [code]
        );

        exists = check.length > 0;
      }

      const finalLabel = label
        ? `${label}${quantity > 1 ? ` ${i + 1}` : ""}`
        : null;

      await conn.execute(
        `
        INSERT INTO tags_qr_codes 
        (code, label, business_id, product_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())   
        `,
        [
          code,
          finalLabel,
          business_id || null,
          product_id,
          status
        ]
      );

      codes.push(code);
    }

    // =========================
    // ✅ COMMIT
    // =========================
    await conn.commit();

    return Response.json({
      ok: true,
      quantity,
      status,
      codes
    });

  } catch (err) {

    await conn.rollback();

    console.error("CREATE QR ERROR:", err);

    return Response.json(
      { error: "Error creando QR" },
      { status: 500 }
    );

  } finally {
    conn.release();
  }
}