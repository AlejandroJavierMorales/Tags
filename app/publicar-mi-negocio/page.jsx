import PublicBusinessSignup from "@/app/modules/directory/components/public/PublicBusinessSignup";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";
import { headers } from "next/headers";
import { getDirectorySiteByCode, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getHeadersHost } from "@/app/lib/channelContext";

export const metadata = { title: "Publicar mi negocio", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function Page() {
  const requestHeaders = await headers();
  const siteCode = await getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
  const site = await getDirectorySiteByCode(siteCode);
  if (!site) return <main><h1>Directorio no disponible</h1></main>;

  return <main className="tags_directory_page">
    <DirectoryPublicHeader site={site} compact showSearch={false} />
    <PublicBusinessSignup />
    <DirectoryPublicFooter site={site} />
  </main>;
}
