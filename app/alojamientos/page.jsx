import { getDirectoryTourismPageData } from "@/app/modules/directory/lib/getDirectoryTourismPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return getDirectoryChannelMetadata({ path: "/alojamientos", title: "Alojamientos en el Valle de Calamuchita", description: "Encontrá alojamientos, cabañas, hoteles y opciones para disfrutar tu estadía en Calamuchita." }); }
export default async function AccommodationPage() { const data = await getDirectoryTourismPageData("accommodation"); return data ? <DirectoryTourismPage data={data} kind="accommodation" /> : null; }
