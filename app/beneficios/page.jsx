export { default } from "@/app/directorio/beneficios/page";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";

export async function generateMetadata() {
  return getDirectoryChannelMetadata({
    path: "/beneficios",
    title: "Beneficios",
    description: "Promociones vigentes de comercios y prestadores.",
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
