import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function getBusinessStats({ businessId, from = null, to = null, qrId }) {
    // ================= DATE FILTER =================
    let dateFilter = "";
    let queryParams = [businessId];

   

    // limpiar inputs
    const safeFrom = from?.trim() || null;
    const safeTo = to?.trim() || null;

    if (safeFrom && safeTo) {
        const end = new Date(safeTo);
        end.setDate(end.getDate() + 1);

        dateFilter = `
        AND c.created_at >= ?
        AND c.created_at < ?
    `;

        queryParams.push(
            safeFrom,
            end.toISOString().slice(0, 10)
        );
    }

    // ================= BUSINESS =================
    const [[business]] = await db.execute(
        `
        SELECT id, name, email
        FROM tags_businesses
        WHERE id = ?
        `,
        [businessId]
    );

    // ================= KPI =================
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

    // ================= TOP QRS =================
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

    // ================= GEO =================
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

    // ================= DEVICES =================
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

    // ================= TIMELINE =================
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

    // ================= MOVEMENTS =================
    const [movements] = await db.execute(
        `
        SELECT 
            c.created_at,
            q.code,
            q.label,
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


    const month = new Date().toISOString().slice(0, 7);

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


    return {
        business,
        filters: {
            from,
            to,
            qrId,
            month
        },
        summary: {
            totalClicks: kpi?.totalClicks || 0,
            uniqueClicks: kpi?.uniqueClicks || 0
        },
        topQrs,
        qrStats,
        geo: {
            countries: Object.entries(countries).map(([country, total]) => ({
                country,
                total
            })),
            cities: Object.entries(cities).map(([city, total]) => ({
                city,
                total
            }))
        },
        devices,
        timeline,
        movements
    };
}