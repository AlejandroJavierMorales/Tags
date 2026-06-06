import { db } from "@/app/lib/tags-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows] = await db.execute(`
      SELECT 
  b.id,
  b.name,
  b.email,
  b.phone,
  b.created_at,

  COUNT(qr.id) AS qr_count,

  SUM(CASE WHEN qr.status = 'active' THEN 1 ELSE 0 END) AS active_qrs,
  SUM(CASE WHEN qr.status = 'available' THEN 1 ELSE 0 END) AS available_qrs,
  SUM(CASE WHEN qr.status = 'assigned' THEN 1 ELSE 0 END) AS assigned_qrs,
  SUM(CASE WHEN qr.status = 'disabled' THEN 1 ELSE 0 END) AS disabled_qrs,

  s.plan_id,
  s.status AS subscription_status,
  s.amount AS subscription_amount,
  s.currency AS subscription_currency,
  s.started_at AS subscription_started_at,
  s.expires_at AS subscription_expires_at,
  s.duration_months AS subscription_duration_months,

  p.name AS plan_name,
  p.code AS plan_code

FROM tags_businesses b

LEFT JOIN tags_qr_codes qr 
  ON qr.business_id = b.id

LEFT JOIN (
    SELECT *
    FROM tags_subscriptions
    WHERE status = 'active'
) s
  ON s.business_id = b.id

LEFT JOIN tags_plans p 
  ON p.id = s.plan_id

GROUP BY 
  b.id,
  b.name,
  b.email,
  b.phone,
  b.created_at,
  s.plan_id,
  s.status,
  s.amount,
  s.currency,
  s.started_at,
  s.expires_at,
  s.duration_months,
  p.name,
  p.code

ORDER BY b.id DESC;
    `);

    return Response.json(rows);

  } catch (error) {
    console.error("BUSINESS LIST ERROR:", error);
    return Response.json([]);
  }
}