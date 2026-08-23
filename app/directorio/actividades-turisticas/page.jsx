import { getDirectoryTourismPageData } from "@/app/modules/directory/lib/getDirectoryTourismPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return getDirectoryChannelMetadata({ path: "/actividades-turisticas", title: "Qué Hacer en el Valle de Calamuchita", description: "Encontrá actividades en Calamuchita.", forceNoindex: true }); }

export default async function ActivitiesDirectoryPage() {
  const data = await getDirectoryTourismPageData("activities");
  if (!data) return null;
  return <DirectoryTourismPage data={data} kind="activities" />;
}
