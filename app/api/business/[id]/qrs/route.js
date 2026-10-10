import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET(req, { params }) {
  try {
    const id = params.id;

    if (!id) {
      return Response.json(
        { error: "Missing id" },
        { status: 400 }
      );
    }

    const [businessRows] = await db.execute(
      `
      SELECT id, name, email, phone
      FROM tags_businesses
      WHERE id = ?
      `,
      [id]
    );

    const business = businessRows[0] || null;

    const [qrRows] = await db.execute(
      `
      SELECT 
        q.id,
        q.code,
        q.label,
        q.final_url,
        q.status,
        q.browser_geolocation_enabled,
        q.event_id,
        p.id as product_id,
        p.name as product_name,
        e.name as event_title,
        ea.id as event_attendee_id,
        ea.name as event_attendee_name,
        ea.email as event_attendee_email
      FROM tags_qr_codes q
      LEFT JOIN tags_products p 
        ON p.id = q.product_id
      LEFT JOIN tags_events e
        ON e.id = q.event_id
      LEFT JOIN tags_event_attendees ea
        ON ea.qr_code_id = q.id
      WHERE q.business_id = ?
      ORDER BY q.id DESC
      `,
      [id]
    );

    return Response.json({
      business,
      qrs: qrRows
    });

  } catch (e) {
    console.error("QRS API ERROR:", e);

    return Response.json(
      { error: e.message || "Internal error" },
      { status: 500 }
    );
  }
}
