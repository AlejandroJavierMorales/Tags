import { getDirectoryTourismPageData } from "@/app/modules/directory/lib/getDirectoryTourismPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ActivitiesDirectoryPage() {
  const data = await getDirectoryTourismPageData("activities");
  if (!data) return null;
  return <DirectoryTourismPage data={data} kind="activities" />;
}
