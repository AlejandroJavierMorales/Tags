import { db } from "@/app/lib/tags-db";
import { requireDirectoryAdmin, directoryAdminError } from "@/app/modules/directory/lib/requireDirectoryAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_CODES = ["directory_web", "directory_web_plus"];

export async function GET() {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  try {
    const [sites] = await db.query("SELECT id,name,code,primary_host FROM tags_directory_sites WHERE is_active=1 ORDER BY name");
    const [plans] = await db.query("SELECT id,code,name,description FROM tags_plans WHERE code IN (?,?) ORDER BY sort_order,name", PLAN_CODES);
    const [prices] = await db.query(`
      SELECT p.*, s.name site_name, s.code site_code, pl.code plan_code, pl.name plan_name
      FROM tags_directory_plan_prices p
      INNER JOIN tags_directory_sites s ON s.id=p.site_id
      INNER JOIN tags_plans pl ON pl.id=p.plan_id
      WHERE s.is_active=1 AND pl.code IN (?,?)
      ORDER BY s.name, pl.sort_order, pl.name
    `, PLAN_CODES);
    return Response.json({ ok: true, sites, plans, prices });
  } catch (error) {
    console.error("DIRECTORY PRICING GET ERROR", error);
    return Response.json({ error: "No se pudo cargar la configuración de precios" }, { status: 500 });
  }
}

export async function POST(req) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const body = await req.json().catch(() => null);
  const siteId = body.siteId ?? body.site_id;
  const planId = body.planId ?? body.plan_id;
  if (!siteId || !planId) return Response.json({ error: "Faltan Directorio y plan" }, { status: 400 });
  const fields = ["manual_month_01","manual_month_02","manual_month_03","manual_month_04","manual_month_05","manual_month_06","manual_month_07","manual_month_08","manual_month_09","manual_month_10","manual_month_11","manual_month_12","manual_pack_3","manual_pack_6","manual_pack_12","mercadopago_monthly"];
  const values = fields.map(field => Math.max(0, Number(body[field] || 0)));
  try {
    const [[plan]] = await db.query("SELECT id,code FROM tags_plans WHERE id=? AND code IN (?,?)", [planId, ...PLAN_CODES]);
    const [[site]] = await db.query("SELECT id FROM tags_directory_sites WHERE id=? AND is_active=1", [siteId]);
    if (!plan || !site) return Response.json({ error: "Directorio o plan inválido" }, { status: 400 });
    await db.query(`
      INSERT INTO tags_directory_plan_prices
        (site_id,plan_id,currency,${fields.join(",")},is_active,created_at,updated_at)
      VALUES (?, ?, ?, ${fields.map(() => "?").join(",")}, 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        currency=VALUES(currency), ${fields.map(field => `${field}=VALUES(${field})`).join(", ")}, is_active=1, updated_at=NOW()
    `, [site.id, plan.id, String(body.currency || "ARS").slice(0, 10), ...values]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DIRECTORY PRICING SAVE ERROR", error);
    return Response.json({ error: "No se pudo guardar la configuración de precios" }, { status: 500 });
  }
}
