import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getDirectoryListingBySlug, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDirectoryWebPageData } from "@/app/modules/directory/lib/getDirectoryWebPageData";
import DirectoryProviderRenderer from "@/app/modules/directory/components/public/DirectoryProviderRenderer";
import "../directoryStandalonePage.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getData(slug) {
  const requestHeaders = await headers();
  const siteCode = await getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
  const data = await getDirectoryListingBySlug(slug, siteCode);
  if (!data || data.listing.publication_status !== "published") return null;
  const web = await getDirectoryWebPageData(data.listing.qr_page_id);
  const catalog = web?.sections?.find(section => section.type === "catalog" || section.settings_json?.directoryBaseSlot === "catalog");
  if (!web || !catalog || catalog.settings_json?.catalogStandalone?.enabled === false) return null;
  return { data, web, catalog };
}

export async function generateMetadata({ params }) {
  const values = await Promise.resolve(params);
  const result = await getData(values.directorySlug);
  if (!result) return {};
  const config = result.catalog.settings_json?.catalogStandalone || {};
  return {
    title: `${config.title || "Catálogo"} · ${result.data.listing.display_name}`,
    description: config.subtitle || result.data.listing.short_description || undefined
  };
}

export default async function DirectoryStandaloneCatalogPage({ params }) {
  const values = await Promise.resolve(params);
  const result = await getData(values.directorySlug);
  if (!result) notFound();
  return <main className="tags_directory_standalone_page">
    <DirectoryProviderRenderer data={result.data} web={result.web} standalone catalogOnly />
  </main>;
}
