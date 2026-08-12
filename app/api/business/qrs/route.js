import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

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
    q.stop_message,
    q.has_qr_page,

    qrp.id AS qr_page_id,
    qrp.status AS qr_page_status,
    qrp.slug AS qr_page_slug,
    qrp.slug_locked,
    qrp.page_type AS qr_page_type,
    ta.id AS turnos_id,

    p.id AS product_id,
    p.name AS product_name,

    t.id AS qr_type_id,
    t.code AS qr_type_code,
    t.name AS qr_type_name,
    t.url_prefix,
    t.placeholder,
    t.input_type,

    GROUP_CONCAT(
      DISTINCT qau.addon_code
      ORDER BY qau.addon_code
      SEPARATOR ','
    ) AS addon_features

  FROM tags_qr_codes q

  LEFT JOIN tags_products p 
    ON p.id = q.product_id

  LEFT JOIN tags_qr_types t
    ON t.id = p.qr_type_id

  LEFT JOIN tags_qr_pages qrp
    ON qrp.qr_code_id = q.id
    AND qrp.business_id = q.business_id

  LEFT JOIN tags_turnos_apps ta
    ON ta.page_id = qrp.id
    AND ta.business_id = q.business_id

  LEFT JOIN tags_qr_addon_usage qau
    ON qau.qr_code_id = q.id
    AND qau.status = 'active'

  WHERE q.business_id = ?

  GROUP BY
    q.id,
    q.code,
    q.label,
    q.final_url,
    q.status,
    q.stop_message,
    q.has_qr_page,
    qrp.id,
    qrp.status,
    qrp.slug,
    qrp.slug_locked,
    qrp.page_type,
    ta.id,
    p.id,
    p.name,
    t.id,
    t.code,
    t.name,
    t.url_prefix,
    t.placeholder,
    t.input_type

  ORDER BY q.id DESC
  `,
    [id]
  );

  const [addonRows] = await db.execute(
    `
  SELECT
    ba.addon_code,
    ba.quantity,
    ba.status,
    a.name
  FROM tags_business_addons ba

  LEFT JOIN tags_addons a
    ON a.code = ba.addon_code

  WHERE ba.business_id = ?
  AND ba.status = 'active'
  AND (
    ba.expires_at IS NULL
    OR ba.expires_at >= NOW()
  )

  ORDER BY a.sort_order ASC, a.name ASC
  `,
    [id]
  );

  const [agencyRows] = await db.execute(
    `SELECT id,slug,status,qr_limit
     FROM tags_qr_agencies
     WHERE business_id=?
     LIMIT 1`,
    [id]
  );

  return Response.json({
    business,
    qrs: qrRows,
    addons: addonRows,
    qrAgency: agencyRows[0] || null
  });
}
