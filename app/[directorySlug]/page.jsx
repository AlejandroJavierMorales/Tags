import { cache } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getHeadersHost } from "@/app/lib/channelContext";
import { db } from "@/app/lib/tags-db";
import { FaChevronRight } from "react-icons/fa6";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";
import DirectoryProviderRenderer from "@/app/modules/directory/components/public/DirectoryProviderRenderer";
import DirectoryEmbeddedStore from "@/app/modules/directory/components/public/DirectoryEmbeddedStore";
import DirectoryEmbeddedResto from "@/app/modules/directory/components/public/DirectoryEmbeddedResto";
import { getDirectoryListingBySlug, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDirectoryWebPageData } from "@/app/modules/directory/lib/getDirectoryWebPageData";
import { getPublicEntitlement } from "@/app/modules/subscriptions/lib/publicEntitlement";
import PublicServicePaused from "@/app/modules/subscriptions/components/PublicServicePaused";
import { getPublicSitemapContext } from "@/app/lib/seo/publicSitemap";
import "./directoryStandalonePage.css";
import "../directorio/prestador/[slug]/directoryProviderPage.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const getListing = cache((slug, siteCode) => getDirectoryListingBySlug(slug, siteCode));
async function getSiteCode() {
  const requestHeaders = await headers();
  return getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
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

function getInternalNavigation(searchParams) {
  const returnHref = String(searchParams?.volver || "");
  if (!returnHref.startsWith("/directorio")) return { internal: false, trail: [] };

  try {
    const parsed = JSON.parse(String(searchParams?.ruta || "[]"));
    const trail = Array.isArray(parsed)
      ? parsed
          .filter(item => item?.label && String(item.href || "").startsWith("/directorio"))
          .slice(0, 6)
      : [];
    return { internal: true, trail };
  } catch {
    return { internal: true, trail: [] };
  }
}

export async function generateMetadata({ params }) {
  const values = await Promise.resolve(params), siteCode = await getSiteCode(), data = await getListing(values.directorySlug, siteCode);
  if (!data) {
    const portal = await getPortalHome(values.directorySlug);
    return portal ? { title: portal.title, description: portal.description || undefined } : {};
  }
  const sitemapContext = await getPublicSitemapContext();
  const web = await getDirectoryWebPageData(data.listing.qr_page_id);
  const page = web?.page;
  const canonical = new URL(`/${data.listing.slug}`, `${sitemapContext.baseUrl}/`).toString();
  return {
    metadataBase: new URL(sitemapContext.baseUrl),
    title: page?.seo_title || data.listing.seo_title || data.listing.display_name,
    description: page?.seo_description || data.listing.seo_description || data.listing.short_description || undefined,
    alternates: { canonical },
    robots: {
      index: !sitemapContext.isTags,
      follow: !sitemapContext.isTags,
      googleBot: {
        index: !sitemapContext.isTags,
        follow: !sitemapContext.isTags,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function DirectoryStandaloneProviderPage({ params, searchParams }) {
  const values = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams || {});
  const siteCode = await getSiteCode();
  const data = await getListing(values.directorySlug, siteCode);
  if (!data) {
    const portal = await getPortalHome(values.directorySlug);
    if (portal?.home_slug) redirect(`/p/${portal.home_slug}`);
    notFound();
  }
  const entitlement = await getPublicEntitlement(data.listing.business_id, "directory");
  if (!entitlement.allowed) return <PublicServicePaused businessName={data.listing.display_name} />;
  const web = await getDirectoryWebPageData(data.listing.qr_page_id);
  const modules = web?.page?.global_styles?.directoryModules || {};
  const { internal, trail } = getInternalNavigation(query);
  const site = { name: data.listing.site_name, code: data.listing.site_code };
  const returnUrl = `/${data.listing.slug}`;

  return <main className={internal ? "tags_directory_provider_page" : "tags_directory_standalone_page"}>
    {internal && <DirectoryPublicHeader site={site} showSearch={false} />}
    {internal && trail.length > 0 && <nav className="tags_directory_provider_breadcrumb" aria-label="Ruta de navegación">
      {trail.map((item, index) => <span key={`${item.href}-${index}`}>
        {index > 0 && <FaChevronRight />}
        <Link href={item.href}>{item.label}</Link>
      </span>)}
      <span><FaChevronRight /><strong>{data.listing.display_name}</strong></span>
    </nav>}
    <DirectoryProviderRenderer
      data={data}
      web={web}
      standalone={!internal}
      embeddedStoreName={web?.embeddedStore?.store?.name || "Tienda"}
      embeddedStoreContent={web?.embeddedStore && modules.store?.enabled !== false
        ? <DirectoryEmbeddedStore data={web.embeddedStore} returnUrl={`${returnUrl}#directory-section-store`} />
        : null}
      embeddedRestoName={web?.embeddedResto?.store?.name || "Gastronomía"}
      embeddedRestoContent={web?.embeddedResto && modules.resto?.enabled !== false
        ? <DirectoryEmbeddedResto data={web.embeddedResto} returnUrl={`${returnUrl}#directory-section-resto`} />
        : null}
    />
    {internal && <DirectoryPublicFooter site={site} />}
  </main>;
}
