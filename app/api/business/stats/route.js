import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";




export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const businessId = searchParams.get("business_id");
    const month = searchParams.get("month"); 
    // formato: 2026-04

    if (!businessId || !month) {
      return Response.json(
        { error: "business_id y month requeridos" },
        { status: 400 }
      );
    }

    // ==============================
    // 📊 FECHAS DEL MES
    // ==============================
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    // ==============================
    // 1. KPI PRINCIPAL
    // ==============================
    const [[kpi]] = await db.execute(
      `
      SELECT 
        COUNT(*) AS totalClicks,
        SUM(is_unique) AS uniqueClicks
      FROM tags_clicks
      WHERE created_at BETWEEN ? AND ?
        AND qr_code_id IN (
          SELECT id FROM tags_qr_codes WHERE business_id = ?
        )
      `,
      [startDate, endDate, businessId]
    );

    // ==============================
    // 2. TOP QRs
    // ==============================
    const [qrStats] = await db.execute(
      `
      SELECT 
        q.id,
        q.code,
        COUNT(c.id) AS clicks,
        SUM(c.is_unique) AS uniques
      FROM tags_clicks c
      JOIN tags_qr_codes q ON q.id = c.qr_code_id
      WHERE q.business_id = ?
        AND c.created_at BETWEEN ? AND ?
      GROUP BY q.id
      ORDER BY clicks DESC
      LIMIT 10
      `,
      [businessId, startDate, endDate]
    );

    // ==============================
    // 3. GEO
    // ==============================
    const [geo] = await db.execute(
      `
      SELECT 
        country,
        city,
        COUNT(*) as total
      FROM tags_clicks c
      JOIN tags_qr_codes q ON q.id = c.qr_code_id
      WHERE q.business_id = ?
        AND c.created_at BETWEEN ? AND ?
      GROUP BY country, city
      ORDER BY total DESC
      LIMIT 20
      `,
      [businessId, startDate, endDate]
    );

    const countries = {};
    const cities = {};

    geo.forEach((g) => {
      if (g.country) {
        countries[g.country] = (countries[g.country] || 0) + g.total;
      }
      if (g.city) {
        cities[g.city] = (cities[g.city] || 0) + g.total;
      }
    });

    // ==============================
    // 4. DEVICES
    // ==============================
    const [devices] = await db.execute(
      `
      SELECT device_type, COUNT(*) as total
      FROM tags_clicks c
      JOIN tags_qr_codes q ON q.id = c.qr_code_id
      WHERE q.business_id = ?
        AND c.created_at BETWEEN ? AND ?
      GROUP BY device_type
      `,
      [businessId, startDate, endDate]
    );

    // ==============================
    // 5. DAILY EVOLUTION
    // ==============================
    const [timeline] = await db.execute(
      `
      SELECT 
  DATE(c.created_at) as date,
  COUNT(*) as clicks,
  SUM(c.is_unique) as uniques
FROM tags_clicks c
JOIN tags_qr_codes q ON q.id = c.qr_code_id
WHERE q.business_id = ?
  AND c.created_at BETWEEN ? AND ?
GROUP BY DATE(c.created_at)
ORDER BY date ASC
      `,
      [businessId, startDate, endDate]
    );

    // ==============================
    // RESPONSE FINAL
    // ==============================
    return Response.json({
      summary: {
        totalClicks: kpi?.totalClicks || 0,
        uniqueClicks: kpi?.uniqueClicks || 0
      },
      topQrs: qrStats,
      geo: {
        countries: Object.entries(countries).map(([k, v]) => ({
          country: k,
          total: v
        })),
        cities: Object.entries(cities).map(([k, v]) => ({
          city: k,
          total: v
        }))
      },
      devices,
      timeline
    });

  } catch (e) {
    console.error("Dashboard client error:", e);
    return Response.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}