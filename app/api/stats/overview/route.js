import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const days = Number(searchParams.get("days") || 30);
    const business_id = searchParams.get("business_id");

    // =========================
    // BASE FILTER
    // =========================
    const filters = [];
    const params = [];

    filters.push(`t.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`);
    params.push(days);

    let joinQR = `
      FROM tags_clicks t
      INNER JOIN tags_qr_codes c ON c.id = t.qr_code_id
    `;

    // =========================
    // FILTRO CLIENTE (REAL)
    // =========================
    if (business_id) {
      filters.push(`c.business_id = ?`);
      params.push(business_id);
    }

    const whereSQL = `WHERE ${filters.join(" AND ")}`;

    // =========================
    // TOTAL CLICKS
    // =========================
    const [[total]] = await db.execute(`
      SELECT COUNT(*) as total
      ${joinQR}
      ${whereSQL}
    `, params);

    // =========================
    // UNIQUE USERS
    // =========================
    const [[unique]] = await db.execute(`
      SELECT COUNT(DISTINCT t.visitor_id) as total
      ${joinQR}
      ${whereSQL}
    `, params);

    // =========================
    // CLICKS HOY
    // =========================
    const [[today]] = await db.execute(`
      SELECT COUNT(*) as total
      ${joinQR}
      ${whereSQL}
      AND DATE(t.created_at) = CURDATE()
    `, params);

    // =========================
    // LAST CLICK
    // =========================
    const [[last]] = await db.execute(`
      SELECT t.created_at
      ${joinQR}
      ${whereSQL}
      ORDER BY t.created_at DESC
      LIMIT 1
    `, params);

    // =========================
    // TOP QRS
    // =========================
    const [top_qrs] = await db.execute(`
      SELECT 
        c.id,
        c.code,
        c.label,
        COUNT(t.id) as total_clicks,
        COUNT(DISTINCT t.visitor_id) as unique_clicks
      ${joinQR}
      ${whereSQL}
      GROUP BY c.id, c.code, c.label
      ORDER BY total_clicks DESC
      LIMIT 10
    `, params);

    // =========================
    // TIMELINE
    // =========================
    const [timeline] = await db.execute(`
      SELECT 
        DATE(t.created_at) as date,
        COUNT(*) as clicks,
        COUNT(DISTINCT t.visitor_id) as unique_clicks
      ${joinQR}
      ${whereSQL}
      GROUP BY DATE(t.created_at)
      ORDER BY date ASC
      LIMIT 30
    `, params);

    // =========================
    // DEVICES
    // =========================
    const [devices] = await db.execute(`
      SELECT 
        t.device_type,
        COUNT(*) as total
      ${joinQR}
      ${whereSQL}
      GROUP BY t.device_type
    `, params);

    // =========================
    // CITIES
    // =========================
    const [cities] = await db.execute(`
      SELECT 
        t.city,
        COUNT(*) as total
      ${joinQR}
      ${whereSQL}
        AND t.city IS NOT NULL
        AND t.city != ''
        AND t.city != 'Unknown'
      GROUP BY t.city
      ORDER BY total DESC
      LIMIT 10
    `, params);

    return Response.json({
      total_clicks: total.total,
      unique_clicks: unique.total,
      clicks_today: today.total,
      last_click: last?.created_at || null,
      top_qrs,
      timeline,
      devices,
      cities
    });

  } catch (err) {
    console.error("STATS ERROR:", err);

    return Response.json(
      { error: "Error stats overview" },
      { status: 500 }
    );
  }
}