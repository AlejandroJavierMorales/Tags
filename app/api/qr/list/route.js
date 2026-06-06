import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const q = searchParams.get("q") || "";

    const limit = 12;
    const offset = (page - 1) * limit;

    const search = `%${q}%`;

    const [rows] = await db.execute(
      `
      SELECT 
        qr.id,
        qr.code,
        qr.label,
        qr.final_url,
        qr.value,
        qr.status,
        qr.stop_message

        -- 👤 CLIENTE
        b.name as business_name,

        -- 🔥 PRODUCTO (REEMPLAZA QR TYPE)
        p.name as product_name,
        p.qr_type_code,
        p.qr_url_prefix

      FROM tags_qr_codes qr

      LEFT JOIN tags_businesses b 
        ON qr.business_id = b.id

      LEFT JOIN tags_products p 
        ON qr.product_id = p.id

      WHERE 
        qr.code LIKE ?
        OR qr.label LIKE ?
        OR b.name LIKE ?
        OR p.name LIKE ?
        OR p.qr_type_code LIKE ?

      ORDER BY qr.id DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      [search, search, search, search, search]
    );

    return Response.json(
      rows.map(qr => ({
        ...qr,
        status: qr.status || "available"
      }))
    );

  } catch (error) {
    console.error("ERROR QR LIST:", error);

    return Response.json([]);
  }
}