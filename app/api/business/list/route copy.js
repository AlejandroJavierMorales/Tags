import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET() {
  try {
    const [rows] = await db.execute(`
      SELECT 
        b.id,
        b.name,
        b.email,
        b.phone,
        b.created_at,

        COUNT(qr.id) AS qr_count,

        SUM(CASE WHEN qr.status = 'active' THEN 1 ELSE 0 END) AS active_qrs,
        SUM(CASE WHEN qr.status = 'available' THEN 1 ELSE 0 END) AS available_qrs,
        SUM(CASE WHEN qr.status = 'assigned' THEN 1 ELSE 0 END) AS assigned_qrs,
        SUM(CASE WHEN qr.status = 'disabled' THEN 1 ELSE 0 END) AS disabled_qrs

      FROM tags_businesses b
      LEFT JOIN tags_qr_codes qr ON qr.business_id = b.id

      GROUP BY b.id
      ORDER BY b.id DESC
    `);

    return Response.json(rows);

  } catch (error) {
    console.error("BUSINESS LIST ERROR:", error);

    return Response.json([]);
  }
}