import { getDirectoryTourismPageData } from "@/app/modules/directory/lib/getDirectoryTourismPageData";
import DirectoryTourismPage from "@/app/modules/directory/components/public/DirectoryTourismPage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function AccommodationPage() { const data = await getDirectoryTourismPageData("accommodation"); return data ? <DirectoryTourismPage data={data} kind="accommodation" /> : null; }
