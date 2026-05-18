import { db } from "@/app/lib/tags-db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const q = searchParams.get("q") || "";

    const limit = 12;
    const offset = (page - 1) * limit;

    const search = `%${q}%`;

    const [rows] = await db.execute(`
      SELECT 
        qr.id,
        qr.code,
        qr.label,
        qr.final_url,
        qr.value,
        qr.is_active,
        b.name as business_name,
        qt.name as qr_type_name,
        qt.code as qr_type_code
      FROM tags_qr_codes qr
      LEFT JOIN tags_businesses b ON qr.business_id = b.id
      LEFT JOIN tags_qr_types qt ON qr.qr_type_id = qt.id
      WHERE 
        qr.code LIKE ?
        OR qr.label LIKE ?
        OR b.name LIKE ?
        OR qt.name LIKE ?
      ORDER BY qr.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `, [search, search, search, search]);

    return Response.json(
      rows.map(qr => ({
        ...qr,
        is_active: Number(qr.is_active)
      }))
    );

  } catch (error) {
    console.error("ERROR QR LIST:", error);

    // 🔥 CRÍTICO: nunca romper frontend
    return Response.json([]);
  }
}