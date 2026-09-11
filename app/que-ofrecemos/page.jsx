import OffersPage, { generateMetadata as getOffersMetadata } from "@/app/directorio/que-ofrecemos/page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return getOffersMetadata();
}

export default OffersPage;
