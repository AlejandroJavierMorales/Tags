import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const offset = (page - 1) * limit;

    let where = [];
    let params = [];

    // =========================
    // 🔍 SEARCH
    // =========================
    if (q) {
      where.push(`(
        q.code LIKE ? OR 
        q.label LIKE ? OR 
        b.name LIKE ? OR 
        b.email LIKE ?
      )`);

      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    // =========================
    // 📊 STATUS
    // =========================
    if (status) {
      where.push(`q.status = ?`);
      params.push(status);
    }

    // =========================
    // 🏷 PRODUCT TYPE
    // =========================
    if (type) {
      where.push(`qt.code = ?`);
      params.push(type);
    }

    const whereSQL = where.length
      ? `WHERE ${where.join(" AND ")}`
      : "";

    // =========================
    // 🔢 TOTAL
    // =========================
    const [[{ total }]] = await db.execute(
      `
  SELECT COUNT(*) as total

  FROM tags_qr_codes q

  LEFT JOIN tags_businesses b 
    ON q.business_id = b.id

  LEFT JOIN tags_products p 
    ON q.product_id = p.id

  LEFT JOIN tags_qr_types qt
    ON p.qr_type_id = qt.id

  ${whereSQL}
  `,
      params
    );

    // =========================
    // 📦 DATA
    // =========================
    const [rows] = await db.execute(
      `
  SELECT 
    q.id,
    q.code,
    q.label,
    q.status,
    q.value,
    q.final_url,
    q.email,
    q.business_id,

    b.name as business_name,

    p.name as product_name,

    qt.id as qr_type_id,
    qt.code as qr_type_code,
    qt.name as qr_type_name

  FROM tags_qr_codes q

  LEFT JOIN tags_businesses b 
    ON q.business_id = b.id

  LEFT JOIN tags_products p 
    ON q.product_id = p.id

  LEFT JOIN tags_qr_types qt
    ON p.qr_type_id = qt.id

  ${whereSQL}

  ORDER BY q.id DESC
  LIMIT ${limit} OFFSET ${offset}
  `,
      params
    );

    return Response.json({
      data: rows,
      total,
      page,
      pages: Math.ceil(total / limit)
    });

  } catch (e) {
    console.error("SEARCH QR API ERROR:", e);

    return Response.json(
      {
        error: e.message || "Internal server error"
      },
      {
        status: 500
      }
    );
  }
}