import { getDirectoryTourismPageData } from "@/app/modules/directory/lib/getDirectoryTourismPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return getDirectoryChannelMetadata({ path: "/alojamientos", title: "Alojamientos en el Valle de Calamuchita", description: "Encontrá alojamientos en Calamuchita.", forceNoindex: true }); }

export default async function AccommodationDirectoryPage() {
  const data = await getDirectoryTourismPageData("accommodation");
  if (!data) return null;
  return <DirectoryTourismPage data={data} kind="accommodation" />;
}
