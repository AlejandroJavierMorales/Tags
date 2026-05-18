import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET() {
    const [data] = await db.execute(`
    SELECT 
      q.code,
      q.label,
      SUM(s.clicks) as clicks
    FROM tags_qr_codes q
    JOIN tags_stats_daily s ON q.id = s.qr_code_id
    GROUP BY q.id
    ORDER BY clicks DESC
    LIMIT 5
  `);

    return Response.json(data);
}