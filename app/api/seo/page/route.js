import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const businessId = Number(url.searchParams.get("businessId") || 0);
    const pageId = Number(url.searchParams.get("pageId") || 0);
    if (!businessId || !pageId) {
      return Response.json({ error: "Faltan el negocio y la página." }, { status: 400 });
    }
    const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status || 403 });
    const [rows] = await db.query(
      `SELECT id, business_id, page_type, slug, title, description,
              seo_title, seo_description, seo_keywords, seo_image_url,
              seo_image_og_url, canonical_url, robots_index, robots_follow,
              status
         FROM tags_qr_pages
        WHERE id = ? AND business_id = ?
        LIMIT 1`,
      [pageId, businessId]
    );
    if (!rows.length) return Response.json({ error: "Página no encontrada." }, { status: 404 });
    const page = rows[0];
    return Response.json({
      ok: true,
      page: {
        ...page,
        seoTitle: page.seo_title || "",
        seoDescription: page.seo_description || "",
        seoKeywords: page.seo_keywords || "",
        seoImageUrl: page.seo_image_url || "",
        seoImageOgUrl: page.seo_image_og_url || "",
        canonicalUrl: page.canonical_url || "",
        indexable: Number(page.robots_index) === 1,
        follow: Number(page.robots_follow) === 1,
      },
    });
  } catch (error) {
    console.error("SEO PAGE GET ERROR", error);
    return Response.json({ error: "No se pudo cargar la configuración SEO." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const businessId = Number(body?.businessId || 0);
    const pageId = Number(body?.pageId || 0);
    if (!businessId || !pageId) return Response.json({ error: "Faltan el negocio y la página." }, { status: 400 });
    const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status || 403 });
    const [pages] = await db.query("SELECT page_type FROM tags_qr_pages WHERE id=? AND business_id=? LIMIT 1", [pageId, businessId]);
    if (!pages.length) return Response.json({ error: "Página no encontrada." }, { status: 404 });
    const values = [
      body.title || null, body.description || null, body.seoTitle || null,
      body.seoDescription || null, body.seoKeywords || null, body.canonicalUrl || null,
      body.seoImageUrl || null, body.seoImageOgUrl || null,
      body.indexable ? 1 : 0, body.follow ? 1 : 0, pageId, businessId,
    ];
    await db.query(`UPDATE tags_qr_pages SET title=?,description=?,seo_title=?,seo_description=?,seo_keywords=?,canonical_url=?,seo_image_url=?,seo_image_og_url=?,robots_index=?,robots_follow=?,updated_at=NOW() WHERE id=? AND business_id=?`, values);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("SEO PAGE UPDATE ERROR", error);
    return Response.json({ error: "No se pudo guardar la configuración SEO." }, { status: 500 });
  }
}
