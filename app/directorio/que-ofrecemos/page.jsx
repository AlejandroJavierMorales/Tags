import { headers } from "next/headers";
import { getDirectorySiteCodeByHost, getDirectorySiteByCode } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";
import DirectoryOffersPage from "./DirectoryOffersPage";
import "./directoryOffersPage.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const title = "Herramientas para Comercios y Prestadores | CalamuchitAr";
  const description = "Página web, tienda online, reservas, carta digital, reseñas, Google Maps, fidelización, inteligencia artificial y herramientas digitales para comercios y prestadores de servicios de Calamuchita.";
  const metadata = await getDirectoryChannelMetadata({ path: "/que-ofrecemos", title, description });
  return {
    ...metadata,
    openGraph: { title, description, type: "website", url: metadata.alternates.canonical }
  };
}

function parseConfig(value) {
  try { return typeof value === "string" ? JSON.parse(value || "{}") : (value || {}); }
  catch { return {}; }
}

function whatsappLink(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("54")) digits = `54${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent("Hola, quiero conocer qué herramientas pueden ayudar a mi negocio.")}`;
}

export default async function CalamuchitarExperiencePage() {
  const requestHeaders = await headers();
  const siteCode = await getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
  const site = await getDirectorySiteByCode(siteCode);
  if (!site) return <main className="tags_directory_unavailable"><h1>Directorio no disponible</h1></main>;

  const brand = parseConfig(site.brand_config);
  const directory = parseConfig(site.directory_config);
  const whatsappUrl = whatsappLink(brand.whatsapp || brand.contactWhatsapp || directory.whatsapp || brand.phone || directory.phone);
  const pageStyle = { "--offers-primary": brand.primaryColor || "#2f7958" };

  return <main className="tags_calamuchitar_experience" style={pageStyle}>
    <DirectoryPublicHeader site={site} compact={false} showSearch={false} />
    <DirectoryOffersPage siteName={site.name || "CalamuchitAr"} whatsappUrl={whatsappUrl} />
    <DirectoryPublicFooter site={site} />
  </main>;
}
