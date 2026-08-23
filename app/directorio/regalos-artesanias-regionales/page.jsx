import { getDirectoryTourismPageData } from "@/app/modules/directory/lib/getDirectoryTourismPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return getDirectoryChannelMetadata({ path: "/regalos-artesanias-regionales", title: "Regalos, Artesanías y Regionales", description: "Encontrá regalos y productos regionales en Calamuchita.", forceNoindex: true }); }

export default async function GiftsDirectoryPage() {
  const data = await getDirectoryTourismPageData("gifts");
  if (!data) return null;
  return <DirectoryTourismPage data={data} kind="gifts" />;
}
