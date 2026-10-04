export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import { refreshDestinationBusinessProjection } from "@/app/modules/destination-ai/server/refreshDestinationBusinessProjection";

function text(value, maxLength) {
    return String(value || "").trim().slice(0, maxLength) || null;
}

export async function POST(request) {
    const body = await request.json().catch(() => null);
    const businessId = Number(body?.businessId || 0);
    const pageId = Number(body?.pageId || 0);
    if (!body || !businessId || !pageId) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
    const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

    const seoTitle = text(body.seoTitle, 255);
    const seoDescription = text(body.seoDescription, 500);
    const seoKeywords = text(body.seoKeywords, 1000);
    const seoImageUrl = text(body.seoImageUrl, 2000);
    const robotsIndex = body.robotsIndex !== false ? 1 : 0;
    const robotsFollow = body.robotsFollow !== false ? 1 : 0;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        const [pages] = await connection.query("SELECT id FROM tags_qr_pages WHERE id=? AND business_id=? AND page_type='directory' LIMIT 1 FOR UPDATE", [pageId, businessId]);
        if (!pages.length) {
            await connection.rollback();
            return Response.json({ error: "Web Directory no encontrada" }, { status: 404 });
        }
        await connection.query(
            `UPDATE tags_qr_pages
             SET seo_title=?,seo_description=?,seo_keywords=?,seo_image_url=?,seo_image_og_url=?,robots_index=?,robots_follow=?,updated_at=NOW()
             WHERE id=? AND business_id=? AND page_type='directory'`,
            [seoTitle, seoDescription, seoKeywords, seoImageUrl, seoImageUrl, robotsIndex, robotsFollow, pageId, businessId]
        );
        await connection.query(
            `UPDATE tags_directory_site_listings sl
             INNER JOIN tags_directory_listings l ON l.id=sl.listing_id
             SET sl.seo_title=?,sl.seo_description=?,sl.seo_keywords=?,sl.updated_at=NOW()
             WHERE l.qr_page_id=? AND l.business_id=?`,
            [seoTitle, seoDescription, seoKeywords, pageId, businessId]
        );
        await connection.commit();
        await refreshDestinationBusinessProjection(businessId).catch(error => console.error("DESTINATION PROJECTION SEO SYNC ERROR", { businessId, error }));
        return Response.json({ ok: true });
    } catch (error) {
        await connection.rollback();
        console.error("DIRECTORY CLIENT SEO UPDATE ERROR", error);
        return Response.json({ error: error.message || "No se pudo guardar el SEO" }, { status: 500 });
    } finally {
        connection.release();
    }
}
