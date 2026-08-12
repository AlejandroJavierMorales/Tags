import { getDirectoryTourismPageData } from "@/app/modules/directory/lib/getDirectoryTourismPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function RestaurantPage() { const data = await getDirectoryTourismPageData("restaurants"); return data ? <DirectoryTourismPage data={data} kind="restaurants" /> : null; }
