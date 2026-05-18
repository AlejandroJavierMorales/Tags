import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  // 👤 CLIENTE
  const [businessRows] = await db.execute(
    `
    SELECT id, name, email, phone
    FROM tags_businesses
    WHERE id = ?
    `,
    [id]
  );

  const business = businessRows[0] || null;

  // 📦 QRs DEL CLIENTE (🔥 NUEVO MODELO)
  const [qrRows] = await db.execute(
    `
   SELECT 
  q.id,
  q.code,
  q.label,
  q.final_url,
  q.status,

  p.id as product_id,
  p.name as product_name,

  t.id as qr_type_id,
  t.code as qr_type_code,
  t.name as qr_type_name,
  t.url_prefix,
  t.placeholder,
  t.input_type

FROM tags_qr_codes q

LEFT JOIN tags_products p 
  ON p.id = q.product_id

LEFT JOIN tags_qr_types t
  ON t.id = p.qr_type_id

WHERE q.business_id = ?
ORDER BY q.id DESC
    `,
    [id]
  );

  return Response.json({
    business,
    qrs: qrRows
  });
}