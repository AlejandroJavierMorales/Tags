import { getDirectoryTourismPageData } from "@/app/modules/directory/lib/getDirectoryTourismPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return getDirectoryChannelMetadata({ path: "/actividades-turisticas", title: "Qué Hacer en el Valle de Calamuchita", description: "Encontrá excursiones, actividades, alquileres y experiencias para vivir Calamuchita." }); }
export default async function ActivitiesPage() { const data = await getDirectoryTourismPageData("activities"); return data ? <DirectoryTourismPage data={data} kind="activities" /> : null; }
