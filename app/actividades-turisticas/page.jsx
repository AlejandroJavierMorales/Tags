import { getDirectoryTourismPageData } from "@/app/modules/directory/lib/getDirectoryTourismPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function ActivitiesPage() { const data = await getDirectoryTourismPageData("activities"); return data ? <DirectoryTourismPage data={data} kind="activities" /> : null; }
