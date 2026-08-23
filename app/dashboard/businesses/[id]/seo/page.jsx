import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import SeoIndexingClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "SEO e indexación | Tags",
  robots: { index: false, follow: false },
};

export default async function BusinessSeoPage({ params }) {
  const { id } = await params;
  const businessId = Number(id);
  const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });

  if (!access.ok) {
    return <main className="tags_dashboard_page"><h2>Sin acceso</h2><p>{access.error}</p></main>;
  }

  const [rows] = await db.query(`
    SELECT
      p.id,
      p.qr_code_id,
      p.page_type,
      p.slug,
      p.title,
      p.status,
      p.robots_index,
      p.robots_follow,
      p.canonical_url,
      q.label AS qr_label,
      dl.id AS directory_listing_id,
      dsl.slug AS directory_slug,
      ds.primary_host AS directory_host
    FROM tags_qr_pages p
    LEFT JOIN tags_qr_codes q
      ON q.id=p.qr_code_id
     AND q.business_id=p.business_id
    LEFT JOIN tags_directory_listings dl
      ON dl.qr_page_id=p.id
     AND dl.business_id=p.business_id
    LEFT JOIN tags_directory_site_listings dsl
      ON dsl.listing_id=dl.id
     AND dsl.publication_status='published'
    LEFT JOIN tags_directory_sites ds
      ON ds.id=dsl.site_id
     AND ds.is_active=1
    WHERE p.business_id=?
      AND p.status IN ('published','draft','archived')
    ORDER BY p.updated_at DESC, p.id DESC
  `, [businessId]);

  const pages = rows.map((page) => {
    const isDirectory = page.page_type === "directory" || Boolean(page.directory_listing_id);
    const isPublished = page.status === "published";
    const isIndexable = isPublished && Number(page.robots_index) === 1 && !isDirectory;
    const publicUrl = isDirectory
      ? (page.directory_host && page.directory_slug ? `https://${page.directory_host}/${page.directory_slug}` : null)
      : (page.slug ? `https://tags.com.ar/p/${page.slug}` : null);

    let reason = "No publicada";
    if (isPublished && isDirectory) reason = "La Web del Directorio se indexa desde el dominio del Directorio, no desde /p";
    else if (isPublished && isIndexable) reason = "Permitida por la configuración SEO";
    else if (isPublished) reason = "Bloqueada por robots_index o por una regla de página";

    return {
      ...page,
      isDirectory,
      isIndexable,
      publicUrl,
      reason,
    };
  });

  return <SeoIndexingClient businessId={businessId} pages={pages} business={access.business} />;
}
