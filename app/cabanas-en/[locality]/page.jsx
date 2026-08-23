import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDirectoryLocalityPageData } from "@/app/modules/directory/lib/getDirectoryLocalityPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function siteCode() {
  const requestHeaders = await headers();
  return getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
}

export async function generateMetadata({ params }) {
  const { locality } = await params;
  return getDirectoryChannelMetadata({
    path: `/cabanas-en/${locality}`,
    title: `Cabañas en ${locality.replace(/-/g, " ")}`,
    description: `Cabañas y alojamientos en ${locality.replace(/-/g, " ")}.`,
  });
}

export default async function LocalityAccommodationPage({ params }) {
  const { locality } = await params;
  const data = await getDirectoryLocalityPageData("accommodation", locality, await siteCode());
  if (!data) notFound();
  return <DirectoryTourismPage data={data} kind="accommodation" />;
}
