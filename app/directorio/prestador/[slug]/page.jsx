import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { FaChevronRight } from "react-icons/fa6";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";
import DirectoryProviderRenderer from "@/app/modules/directory/components/public/DirectoryProviderRenderer";
import DirectoryEmbeddedStore from "@/app/modules/directory/components/public/DirectoryEmbeddedStore";
import DirectoryEmbeddedResto from "@/app/modules/directory/components/public/DirectoryEmbeddedResto";
import { getDirectoryListingBySlug, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDirectoryWebPageData } from "@/app/modules/directory/lib/getDirectoryWebPageData";
import "./directoryProviderPage.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getListing = cache((slug, siteCode) => getDirectoryListingBySlug(slug, siteCode));

async function currentSiteCode() {
    const requestHeaders = await headers();
    return getDirectorySiteCodeByHost(requestHeaders.get("host"));
}

function safeTrail(raw, returnHref) {
    if (!returnHref?.startsWith("/directorio")) return [];
    try {
        const parsed = JSON.parse(raw || "[]");
        return Array.isArray(parsed)
            ? parsed.filter(item => item?.label && String(item.href || "").startsWith("/directorio")).slice(0, 6)
            : [];
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }) {
    const values = await Promise.resolve(params);
    const data = await getListing(values.slug, await currentSiteCode());
    if (!data) return { title: "Prestador no encontrado | CalamuchitAr" };
    const web = await getDirectoryWebPageData(data.listing.qr_page_id);
    return {
        title: web?.page?.seo_title || data.listing.seo_title || `${data.listing.display_name} | CalamuchitAr`,
        description: web?.page?.seo_description || data.listing.seo_description || data.listing.short_description || undefined,
        alternates: { canonical: `/${data.listing.slug}` }
    };
}

export default async function DirectoryProviderPage({ params, searchParams }) {
    const values = await Promise.resolve(params);
    const query = await Promise.resolve(searchParams || {});
    const data = await getListing(values.slug, await currentSiteCode());
    if (!data) notFound();

    const web = await getDirectoryWebPageData(data.listing.qr_page_id);
    const trail = safeTrail(String(query.ruta || ""), String(query.volver || ""));
    const internal = trail.length > 0;
    const modules = web?.page?.global_styles?.directoryModules || {};
    return <main className={`tags_directory_provider_page${internal ? "" : " is_standalone"}`}>
        {internal && <DirectoryPublicHeader site={{ name: data.listing.site_name, code: data.listing.site_code }} showSearch={false} />}
        {internal && <nav className="tags_directory_provider_breadcrumb" aria-label="Ruta de navegación">
            {trail.map((item, index) => <span key={`${item.href}-${index}`}>{index > 0 && <FaChevronRight />}<Link href={item.href}>{item.label}</Link></span>)}
            <span><FaChevronRight /><strong>{data.listing.display_name}</strong></span>
        </nav>}
        <DirectoryProviderRenderer data={data} web={web} standalone={!internal} embeddedStoreName={web?.embeddedStore?.store?.name || "Tienda"} embeddedStoreContent={web?.embeddedStore&&modules.store?.enabled!==false ? <DirectoryEmbeddedStore data={web.embeddedStore} returnUrl={`/directorio/prestador/${data.listing.slug}#directory-section-store`} /> : null} embeddedRestoName={web?.embeddedResto?.store?.name || "Gastronomía"} embeddedRestoContent={web?.embeddedResto&&modules.resto?.enabled!==false ? <DirectoryEmbeddedResto data={web.embeddedResto} returnUrl={`/directorio/prestador/${data.listing.slug}#directory-section-resto`} /> : null} />
        {internal && <DirectoryPublicFooter site={{ name: data.listing.site_name, code: data.listing.site_code }} />}
    </main>;
}
