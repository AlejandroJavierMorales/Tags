import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET() {
  try {

    // -----------------------------
    // TOTAL CLICKS
    // -----------------------------
    const [[total]] = await db.execute(`
      SELECT COUNT(*) as total
      FROM tags_clicks
    `);

    // -----------------------------
    // TOTAL UNIQUE
    // -----------------------------
    const [[unique]] = await db.execute(`
      SELECT COUNT(DISTINCT visitor_id) as total
      FROM tags_clicks
    `);

    // -----------------------------
    // CLICKS HOY
    // -----------------------------
    const [[today]] = await db.execute(`
      SELECT COUNT(*) as total
      FROM tags_clicks
      WHERE DATE(created_at) = CURDATE()
    `);

    // -----------------------------
    // ÚLTIMO CLICK
    // -----------------------------
    const [[last]] = await db.execute(`
      SELECT created_at
      FROM tags_clicks
      ORDER BY created_at DESC
      LIMIT 1
    `);

    // -----------------------------
    // TOP QRs
    // -----------------------------
    const [topQrs] = await db.execute(`
      SELECT 
  c.code,
  c.label,
  COUNT(t.id) as total_clicks
FROM tags_qr_codes c
LEFT JOIN tags_clicks t ON t.code = c.code
GROUP BY c.code, c.label
ORDER BY total_clicks DESC
LIMIT 10;
    `);

    // -----------------------------
    // CLICKS POR DÍA (últimos 30)
    // -----------------------------
    const [timeline] = await db.execute(`
      SELECT date, clicks, unique_clicks
      FROM tags_stats_daily
      ORDER BY date DESC
      LIMIT 30
    `);
    // -----------------------------
    // DISPOSITIVOS
    // -----------------------------
    const [devices] = await db.execute(`
  SELECT device_type, COUNT(*) as total
  FROM tags_clicks
  GROUP BY device_type
  ORDER BY total DESC
`);


    return Response.json({
      total_clicks: total.total,
      unique_clicks: unique.total,
      clicks_today: today.total,
      last_click: last?.created_at || null,
      top_qrs: topQrs,
      timeline: timeline.reverse(), // para gráfico
      devices
    });

  } catch (err) {
    console.error("STATS ERROR:", err);

    return Response.json(
      { error: "Error obteniendo estadísticas" },
      { status: 500 }
    );
  }
}