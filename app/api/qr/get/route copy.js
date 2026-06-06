import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";




export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return Response.json(
        { error: "Falta code" },
        { status: 400 }
      );
    }

    const [rows] = await db.execute(
      `
      SELECT 
        qr.*,

        p.name AS product_name,
        p.id AS product_code,

        qt.id AS qr_type_id,
        qt.code AS qr_type_code,
        qt.name AS qr_type_name,
        qt.input_type AS qr_input_type,
        qt.url_prefix AS qr_url_prefix

      FROM tags_qr_codes qr

      JOIN tags_products p 
        ON p.id = qr.product_id

      LEFT JOIN tags_qr_types qt
        ON qt.id = p.qr_type_id

      WHERE qr.code = ?
      LIMIT 1
      `,
      [code]
    );

    const qr = rows[0];

    if (!qr) {
      return Response.json(
        { error: "QR no encontrado" },
        { status: 404 }
      );
    }

    return Response.json({
      ...qr,
      status: qr.status || "available"
    });

  } catch (error) {
    console.error("GET QR ERROR:", error);

    return Response.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}