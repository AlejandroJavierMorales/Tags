import ExperiencePage, { generateMetadata as getExperienceMetadata } from "@/app/directorio/experiencia/page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return getExperienceMetadata();
}

export default ExperiencePage;
