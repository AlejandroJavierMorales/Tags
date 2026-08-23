import { getDirectoryTourismPageData } from "@/app/modules/directory/lib/getDirectoryTourismPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return getDirectoryChannelMetadata({ path: "/donde-comer", title: "Dónde Comer en el Valle de Calamuchita", description: "Descubrí dónde comer en Calamuchita.", forceNoindex: true }); }

export default async function RestaurantDirectoryPage() {
  const data = await getDirectoryTourismPageData("restaurants");
  if (!data) return null;
  return <DirectoryTourismPage data={data} kind="restaurants" />;
}
