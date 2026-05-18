import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET(req, { params }) {
  try {
    const businessId = params.id;

    if (!businessId) {
      return Response.json(
        { error: "business_id requerido" },
        { status: 400 }
      );
    }

    // ==============================
    // 1. QUERY PARAMS (PRIMERO SIEMPRE)
    // ==============================
    const { searchParams } = new URL(req.url);

    const qrId = searchParams.get("qr_id");
    const month = searchParams.get("month");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // ==============================
    // 2. DATE FILTER BASE
    // ==============================
    let dateFilter = "";
    let queryParams = [businessId];

    if (from && to) {

      const start = new Date(from);
      const end = new Date(to);

      // +1 día para incluir último día completo
      end.setDate(end.getDate() + 1);

      dateFilter = `
        AND c.created_at >= ?
        AND c.created_at < ?
      `;

      queryParams.push(
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10)
      );

    } else if (month) {

      const startDate = new Date(`${month}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      dateFilter = `
        AND c.created_at >= ?
        AND c.created_at < ?
      `;

      queryParams.push(
        startDate.toISOString().slice(0, 10),
        endDate.toISOString().slice(0, 10)
      );
    }

    // ==============================
    // 3. QR FILTER (DESPUÉS DEL DATE FILTER)
    // ==============================
    if (qrId && qrId !== "all") {
      dateFilter += ` AND q.id = ? `;
      queryParams.push(qrId);
    }

    // ==============================
    // 4. BUSINESS INFO
    // ==============================
    const [[business]] = await db.execute(
      `
      SELECT id, name, email
      FROM tags_businesses
      WHERE id = ?
      `,
      [businessId]
    );

    // ==============================
    // 5. KPI
    // ==============================
    const [[kpi]] = await db.execute(
      `
      SELECT 
        COUNT(*) AS totalClicks,
        SUM(is_unique) AS uniqueClicks
      FROM tags_clicks c
      JOIN tags_qr_codes q ON q.id = c.qr_code_id
      WHERE q.business_id = ?
      ${dateFilter}
      `,
      queryParams
    );

    // ==============================
    // 6. TOP 10 QRS
    // ==============================
    const [topQrs] = await db.execute(
      `
      SELECT 
        q.id,
        q.code,
        q.label,
        COUNT(c.id) AS clicks,
        SUM(c.is_unique) AS uniques
      FROM tags_clicks c
      JOIN tags_qr_codes q ON q.id = c.qr_code_id
      WHERE q.business_id = ?
      ${dateFilter}
      GROUP BY q.id
      ORDER BY clicks DESC
      LIMIT 10
      `,
      queryParams
    );
    // ==============================
    // 6. TODOS LOS QRS
    // ==============================
    const [qrStats] = await db.execute(`
  SELECT 
    q.id,
    q.code,
    q.label,
    COUNT(c.id) AS clicks,
    SUM(c.is_unique) AS uniques
  FROM tags_clicks c
  JOIN tags_qr_codes q ON q.id = c.qr_code_id
  WHERE q.business_id = ?
  ${dateFilter}
  GROUP BY q.id
  ORDER BY clicks DESC
`, queryParams);

    // ==============================
    // 7. GEO
    // ==============================
    const [geoRows] = await db.execute(
      `
      SELECT 
        c.country,
        c.city,
        COUNT(*) as total
      FROM tags_clicks c
      JOIN tags_qr_codes q ON q.id = c.qr_code_id
      WHERE q.business_id = ?
      ${dateFilter}
      GROUP BY c.country, c.city
      ORDER BY total DESC
      `,
      queryParams
    );

    const countries = {};
    const cities = {};

    geoRows.forEach((g) => {
      if (g.country) {
        countries[g.country] = (countries[g.country] || 0) + g.total;
      }
      if (g.city) {
        cities[g.city] = (cities[g.city] || 0) + g.total;
      }
    });

    // ==============================
    // 8. DEVICES
    // ==============================
    const [devices] = await db.execute(
      `
      SELECT 
        device_type,
        COUNT(*) as total
      FROM tags_clicks c
      JOIN tags_qr_codes q ON q.id = c.qr_code_id
      WHERE q.business_id = ?
      ${dateFilter}
      GROUP BY device_type
      `,
      queryParams
    );

    // ==============================
    // 9. TIMELINE
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
      ${dateFilter}
      GROUP BY DATE(c.created_at)
      ORDER BY date ASC
      `,
      queryParams
    );

    // ==============================
    // 10. MOVEMENTS
    // ==============================
    const [movements] = await db.execute(
      `
      SELECT 
        c.created_at,
        q.code,
        q.label,
        c.ip,
        c.country,
        c.city,
        c.device_type,
        c.os,
        c.browser,
        c.is_unique
      FROM tags_clicks c
      JOIN tags_qr_codes q ON q.id = c.qr_code_id
      WHERE q.business_id = ?
      ${dateFilter}
      ORDER BY c.created_at DESC
      LIMIT 300
      `,
      queryParams
    );

    // ==============================
    // RESPONSE FINAL
    // ==============================
    return Response.json({
      business: {
        id: business?.id,
        name: business?.name,
        email: business?.email
      },

      summary: {
        totalClicks: kpi?.totalClicks || 0,
        uniqueClicks: kpi?.uniqueClicks || 0
      },

      topQrs,
      qrStats,
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
      timeline,
      movements
    });

  } catch (e) {
    console.error("Business stats error:", e);

    return Response.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}