import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET() {
  try {

    const [rows] = await db.execute(`
      SELECT 
        p.id,
        p.name,
        p.is_digital,
        p.qr_type_id,
        p.support_id,
        p.url_prefix,

        -- QR TYPE
        qt.code AS qr_type_code,
        qt.name AS qr_type_name,
        qt.input_type,
        qt.placeholder,
        qt.helper_text,
        qt.validation_regex,

        -- SUPPORT
        s.name AS support_name,
        s.type AS support_type

      FROM tags_products p

      LEFT JOIN tags_qr_types qt
        ON qt.id = p.qr_type_id

      LEFT JOIN tags_supports s
        ON s.id = p.support_id

      ORDER BY p.name ASC
    `);

    return Response.json({
      ok: true,
      data: rows
    });

  } catch (err) {

    console.error("PRODUCTS API ERROR:", err);

    return Response.json(
      {
        ok: false,
        error: err.message || "Internal server error",
        data: []
      },
      {
        status: 500
      }
    );
  }
}