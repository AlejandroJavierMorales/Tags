import { getDirectoryTourismPageData } from "@/app/modules/directory/lib/getDirectoryTourismPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return getDirectoryChannelMetadata({ path: "/regalos-artesanias-regionales", title: "Regalos, Artesanías y Productos Regionales", description: "Encontrá regalos, artesanías y productos regionales del Valle de Calamuchita." }); }
export default async function GiftsPage() { const data = await getDirectoryTourismPageData("gifts"); return data ? <DirectoryTourismPage data={data} kind="gifts" /> : null; }
