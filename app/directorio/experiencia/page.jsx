import { headers } from "next/headers";
import { getDirectorySiteCodeByHost, getDirectorySiteByCode } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getHeadersHost } from "@/app/lib/channelContext";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";
import CalamuchitarExperience from "./CalamuchitarExperience";
import "./calamuchitarExperience.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "CalamuchitAr | La Plataforma Comercial de Calamuchita", description: "Descubrí Calamuchita o conocé cómo publicar tu negocio en la Plataforma Comercial de Calamuchita." };
}

export default async function CalamuchitarExperiencePage() {
  const requestHeaders = await headers();
  const siteCode = await getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
  const site = await getDirectorySiteByCode(siteCode);
  if (!site) return <main className="tags_directory_unavailable"><h1>CalamuchitAr no disponible</h1></main>;
  return <main className="tags_calamuchitar_experience"><DirectoryPublicHeader site={site} compact={false} showSearch={false} /><CalamuchitarExperience /><DirectoryPublicFooter site={site} /></main>;
}
