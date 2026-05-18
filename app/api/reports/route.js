import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET() {
  const [data] = await db.execute(`
    SELECT 
      q.code,
      q.label,
      COUNT(c.id) as total_clicks
    FROM tags_qr_codes q
    LEFT JOIN tags_clicks c ON q.id = c.qr_code_id
    GROUP BY q.id
    ORDER BY total_clicks DESC
  `);

  return Response.json(data);
}