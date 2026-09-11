import LoyaltyProgramsPage, { generateMetadata as getLoyaltyProgramsMetadata } from "@/app/directorio/programas-de-fidelizacion/page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return getLoyaltyProgramsMetadata();
}

export default LoyaltyProgramsPage;
