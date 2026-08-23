import { getDirectoryTourismPageData } from "@/app/modules/directory/lib/getDirectoryTourismPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return getDirectoryChannelMetadata({ path: "/donde-comer", title: "Dónde Comer en el Valle de Calamuchita", description: "Descubrí restaurantes, bares, cervecerías, comedores y sabores regionales de Calamuchita." }); }
export default async function RestaurantPage() { const data = await getDirectoryTourismPageData("restaurants"); return data ? <DirectoryTourismPage data={data} kind="restaurants" /> : null; }
