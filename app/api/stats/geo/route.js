import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET() {
  try {

    // 🌍 PAÍSES
    const [countries] = await db.execute(`
      SELECT country, COUNT(*) as total
      FROM tags_clicks
      WHERE country IS NOT NULL AND country != ''
      GROUP BY country
      ORDER BY total DESC
      LIMIT 10
    `);

    // 🏙 CIUDADES
    const [cities] = await db.execute(`
      SELECT city, COUNT(*) as total
      FROM tags_clicks
      WHERE city IS NOT NULL AND city != ''
      GROUP BY city
      ORDER BY total DESC
      LIMIT 10
    `);

    // 🏔 PROVINCIAS (solo si existen)
    const [regions] = await db.execute(`
      SELECT region, COUNT(*) as total
      FROM tags_clicks
      WHERE region IS NOT NULL AND region != ''
      GROUP BY region
      ORDER BY total DESC
      LIMIT 10
    `);

    return Response.json({
      countries,
      cities,
      regions
    });

  } catch (e) {
    console.error("Geo stats error:", e);
    return Response.json({ error: "Error" }, { status: 500 });
  }
}