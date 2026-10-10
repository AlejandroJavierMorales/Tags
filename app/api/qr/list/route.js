import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const q = searchParams.get("q") || "";

    const limit = 12;
    const offset = (page - 1) * limit;

    const search = `%${q}%`;

    const [rows] = await db.execute(
      `
      SELECT 
        qr.id,
        qr.code,
        qr.label,
        qr.final_url,
        qr.value,
        qr.status,
        qr.stop_message
        ,qr.browser_geolocation_enabled
        ,qr.event_id

        -- 👤 CLIENTE
        b.name as business_name,

        -- 🔥 PRODUCTO (REEMPLAZA QR TYPE)
        p.name as product_name,
        qt.code AS qr_type_code,
        qt.name AS qr_type_name,
        qt.url_prefix AS qr_url_prefix,
        e.name AS event_title,
        ea.id AS event_attendee_id,
        ea.name AS event_attendee_name,
        ea.email AS event_attendee_email

      FROM tags_qr_codes qr

      LEFT JOIN tags_businesses b 
        ON qr.business_id = b.id

      LEFT JOIN tags_products p 
        ON qr.product_id = p.id

      LEFT JOIN tags_qr_types qt
        ON qt.id = p.qr_type_id

      LEFT JOIN tags_events e
        ON e.id = qr.event_id

      LEFT JOIN tags_event_attendees ea
        ON ea.qr_code_id = qr.id

      WHERE 
        qr.code LIKE ?
        OR qr.label LIKE ?
        OR b.name LIKE ?
        OR p.name LIKE ?
        OR qt.code LIKE ?
        OR e.name LIKE ?
        OR ea.name LIKE ?
        OR ea.email LIKE ?

      ORDER BY qr.id DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      [search, search, search, search, search, search, search, search]
    );

    return Response.json(
      rows.map(qr => ({
        ...qr,
        status: qr.status || "available"
      }))
    );

  } catch (error) {
    console.error("ERROR QR LIST:", error);

    return Response.json([]);
  }
}
