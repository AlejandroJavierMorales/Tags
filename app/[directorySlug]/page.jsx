import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/app/lib/tags-db";
import DirectoryProviderRenderer from "@/app/modules/directory/components/public/DirectoryProviderRenderer";
import DirectoryEmbeddedStore from "@/app/modules/directory/components/public/DirectoryEmbeddedStore";
import DirectoryEmbeddedResto from "@/app/modules/directory/components/public/DirectoryEmbeddedResto";
import { getDirectoryListingBySlug, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDirectoryWebPageData } from "@/app/modules/directory/lib/getDirectoryWebPageData";
import "./directoryStandalonePage.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const getListing = cache((slug, siteCode) => getDirectoryListingBySlug(slug, siteCode));
async function getSiteCode() {
  const requestHeaders = await headers();
  return getDirectorySiteCodeByHost(requestHeaders.get("host"));
}

async function getPortalHome(slug) {
  const [rows] = await db.query(
    `SELECT p.title,p.description,qp.slug home_slug
     FROM tags_portals p
     INNER JOIN tags_portal_routes r ON r.id=p.home_route_id AND r.portal_id=p.id AND r.is_visible=1
     INNER JOIN tags_qr_pages qp ON qp.id=r.page_id AND qp.status='published'
     WHERE p.slug=? AND p.status='published' LIMIT 1`,
    [slug]
  );
  return rows[0] || null;
}

export async function generateMetadata({ params }) {
  const values = await Promise.resolve(params), siteCode = await getSiteCode(), data = await getListing(values.directorySlug, siteCode);
  if (!data) {
    const portal = await getPortalHome(values.directorySlug);
    return portal ? { title: portal.title, description: portal.description || undefined } : {};
  }
  const web = await getDirectoryWebPageData(data.listing.qr_page_id);
  const page = web?.page;
  return { title: page?.seo_title || data.listing.seo_title || data.listing.display_name, description: page?.seo_description || data.listing.seo_description || data.listing.short_description || undefined, alternates: { canonical: `/${data.listing.slug}` } };
}

export default async function DirectoryStandaloneProviderPage({ params }) {
  const values = await Promise.resolve(params), siteCode = await getSiteCode(), data = await getListing(values.directorySlug, siteCode);
  if (!data) {
    const portal = await getPortalHome(values.directorySlug);
    if (portal?.home_slug) redirect(`/p/${portal.home_slug}`);
    notFound();
  }
  const web = await getDirectoryWebPageData(data.listing.qr_page_id);
  const modules=web?.page?.global_styles?.directoryModules||{};
  return <main className="tags_directory_standalone_page"><DirectoryProviderRenderer data={data} web={web} standalone embeddedStoreName={web?.embeddedStore?.store?.name || "Tienda"} embeddedStoreContent={web?.embeddedStore&&modules.store?.enabled!==false ? <DirectoryEmbeddedStore data={web.embeddedStore} returnUrl={`/${data.listing.slug}#directory-section-store`} /> : null} embeddedRestoName={web?.embeddedResto?.store?.name || "Gastronomía"} embeddedRestoContent={web?.embeddedResto&&modules.resto?.enabled!==false ? <DirectoryEmbeddedResto data={web.embeddedResto} returnUrl={`/${data.listing.slug}#directory-section-resto`} /> : null} /></main>;
}
