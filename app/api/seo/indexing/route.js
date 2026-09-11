import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const businessId = Number(body?.businessId || 0);
    const pageId = Number(body?.pageId || 0);
    const indexable = body?.indexable === true || Number(body?.indexable) === 1;
    if (!businessId || !pageId) return Response.json({ error: "Faltan el negocio y la página." }, { status: 400 });

    const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status || 403 });

    const [pages] = await db.query(
      "SELECT id,page_type FROM tags_qr_pages WHERE id=? AND business_id=? LIMIT 1",
      [pageId, businessId]
    );
    if (!pages.length) return Response.json({ error: "Página no encontrada." }, { status: 404 });
    if (pages[0].page_type === "directory") {
      return Response.json({ error: "La Web del Directorio se indexa desde el dominio del Directorio." }, { status: 409 });
    }

    await db.query(
      "UPDATE tags_qr_pages SET robots_index=?,robots_follow=?,updated_at=NOW() WHERE id=? AND business_id=?",
      [indexable ? 1 : 0, indexable ? 1 : 0, pageId, businessId]
    );
    return Response.json({ ok: true, indexable });
  } catch (error) {
    console.error("SEO INDEXING UPDATE ERROR", error);
    return Response.json({ error: "No se pudo actualizar la configuración SEO." }, { status: 500 });
  }
}
