import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET() {
    const [totals] = await db.execute(`
    SELECT 
      COUNT(DISTINCT q.id) as total_qrs,
      COUNT(c.id) as total_clicks
    FROM tags_qr_codes q
    LEFT JOIN tags_clicks c ON q.id = c.qr_code_id
  `);

    const [last30] = await db.execute(`
    SELECT date, SUM(clicks) as clicks
    FROM tags_stats_daily
    WHERE date >= CURDATE() - INTERVAL 30 DAY
    GROUP BY date
    ORDER BY date ASC
  `);

    return Response.json({
        totals: totals[0],
        chart: last30
    });
}