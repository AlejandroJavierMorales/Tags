export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";

async function accessFor(businessId) {
  return requireQRPageAccess(businessId, { skipQRPageValidation: true });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const businessId = Number(searchParams.get("businessId") || 0);
  const pageId = Number(searchParams.get("pageId") || 0);
  if (!businessId || !pageId) return Response.json({ error: "Datos incompletos" }, { status: 400 });
  const access = await accessFor(businessId);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
  const [[page]] = await db.query(
    "SELECT catalog_product_limit FROM tags_qr_pages WHERE id=? AND business_id=? AND page_type='directory' LIMIT 1",
    [pageId, businessId]
  );
  if (!page) return Response.json({ error: "Mi Web no encontrada" }, { status: 404 });
  return Response.json({ limit: Number(page.catalog_product_limit || 50), canManage: access.session?.role === "admin" });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const businessId = Number(body.businessId || 0);
  const pageId = Number(body.pageId || 0);
  const limit = Math.max(1, Math.min(5000, Number(body.limit || 50)));
  if (!businessId || !pageId) return Response.json({ error: "Datos incompletos" }, { status: 400 });
  const access = await accessFor(businessId);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
  if (access.session?.role !== "admin") return Response.json({ error: "Sólo la administración de la plataforma puede modificar esta capacidad" }, { status: 403 });
  const [result] = await db.query(
    "UPDATE tags_qr_pages SET catalog_product_limit=?,updated_at=NOW() WHERE id=? AND business_id=? AND page_type='directory'",
    [limit, pageId, businessId]
  );
  if (!result.affectedRows) return Response.json({ error: "Mi Web no encontrada" }, { status: 404 });
  return Response.json({ ok: true, limit });
}
