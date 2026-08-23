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
    path: `/que-regalar-en/${locality}`,
    title: `Qué Regalar en ${locality.replace(/-/g, " ")}`,
    description: `Regalos, artesanías y productos regionales en ${locality.replace(/-/g, " ")}.`,
  });
}

export default async function LocalityGiftsPage({ params }) {
  const { locality } = await params;
  const data = await getDirectoryLocalityPageData("gifts", locality, await siteCode());
  if (!data) notFound();
  return <DirectoryTourismPage data={data} kind="gifts" />;
}
