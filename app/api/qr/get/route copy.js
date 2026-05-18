import { db } from "@/app/lib/tags-db";

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
        qt.name AS qr_type_name,
        qt.code AS qr_type_code
      FROM tags_qr_codes qr
      LEFT JOIN tags_qr_types qt 
        ON qr.qr_type_id = qt.id
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

    return Response.json(qr);

  } catch (error) {
    console.error("GET QR ERROR:", error);

    return Response.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}