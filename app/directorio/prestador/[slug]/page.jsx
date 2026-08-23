import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getDirectoryListingBySlug, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDirectoryWebPageData } from "@/app/modules/directory/lib/getDirectoryWebPageData";
import { getPublicSitemapContext } from "@/app/lib/seo/publicSitemap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getListing = cache((slug, siteCode) => getDirectoryListingBySlug(slug, siteCode));

async function currentSiteCode() {
    const requestHeaders = await headers();
    return getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
}

export async function generateMetadata({ params }) {
    const values = await Promise.resolve(params);
    const data = await getListing(values.slug, await currentSiteCode());
    if (!data) return { title: "Prestador no encontrado | CalamuchitAr" };
    const web = await getDirectoryWebPageData(data.listing.qr_page_id);
    const context = await getPublicSitemapContext();
    const canonical = new URL(`/${data.listing.slug}`, `${context.baseUrl}/`).toString();
    return {
        metadataBase: new URL(context.baseUrl),
        title: web?.page?.seo_title || data.listing.seo_title || `${data.listing.display_name} | CalamuchitAr`,
        description: web?.page?.seo_description || data.listing.seo_description || data.listing.short_description || undefined,
        alternates: { canonical }
    };
}

export default async function DirectoryProviderPage({ params, searchParams }) {
    const values = await Promise.resolve(params);
    const query = await Promise.resolve(searchParams || {});
    const forwarded = new URLSearchParams();
    if (String(query.volver || "").startsWith("/directorio")) forwarded.set("volver", String(query.volver));
    if (query.ruta) forwarded.set("ruta", String(query.ruta));
    const suffix = forwarded.toString();
    redirect(`/${values.slug}${suffix ? `?${suffix}` : ""}`);
}
