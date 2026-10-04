import { headers } from "next/headers";
import { getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";

const TAGS_CONTEXT = {
  code: "tags",
  name: "Tags",
  productName: "Tags – Perfiles de Negocios",
  description: "Plataforma de experiencias digitales y herramientas de gestión para comercios y prestadores.",
  logoUrl: "/logo_tags_transparente.webp",
  contactEmail: "info@tags.com.ar",
  accentColor: "#159552",
  homeUrl: "https://tags.com.ar/",
  host: "tags.com.ar",
  isMuchi: false,
  isDirectory: false,
};

function cleanHost(value) {
  return String(value || "").toLowerCase().split(",")[0].split(":")[0].replace(/^www\./, "");
}

export async function getLegalSiteContext() {
  const requestHeaders = await headers();
  const publicHost = cleanHost(getHeadersHost(requestHeaders));
  const isMuchi = publicHost.startsWith("muchi.");
  const channelHost = isMuchi ? publicHost.replace(/^muchi\./, "") : publicHost;
  let channel = null;
  try { channel = await getChannelContextFromHost(channelHost); } catch {}

  if (!channel || channel.isTags) return { ...TAGS_CONTEXT, host: publicHost || TAGS_CONTEXT.host };

  const brand = channel.brandConfig || {};
  const isCalamuchitar = channel.code === "calamuchitar";
  const directoryName = brand.displayName || channel.name || "Directorio comercial";
  if (isMuchi) {
    return {
      code: "muchi",
      name: "Muchi",
      productName: "Muchi – Asistente virtual de comercio y turismo de Calamuchita",
      description: "Asistente virtual de CalamuchitAr para descubrir comercios, servicios, productos y propuestas turísticas del Valle de Calamuchita.",
      logoUrl: "/assets/destination-ai/muchi/icons/muchi-icon-192.png",
      contactEmail: "info@calamuchita.ar",
      accentColor: "#e78621",
      homeUrl: `https://${publicHost}/`,
      host: publicHost,
      isMuchi: true,
      isDirectory: true,
      directoryName,
    };
  }

  return {
    code: channel.code,
    name: directoryName,
    productName: isCalamuchitar ? "CalamuchitAr – La Plataforma Comercial de Calamuchita" : `${directoryName} – Plataforma Comercial`,
    description: isCalamuchitar
      ? "Directorio y plataforma comercial para encontrar comercios, prestadores, productos, servicios y propuestas del Valle de Calamuchita."
      : `Directorio comercial de ${directoryName}, desarrollado con tecnología Tags.`,
    logoUrl: brand.logoUrl || (isCalamuchitar ? "/directory/calamuchitar/LogoCalamuchitar.webp" : "/logo_tags_transparente.webp"),
    contactEmail: isCalamuchitar ? "info@calamuchita.ar" : "info@tags.com.ar",
    accentColor: brand.primaryColor || "#2f7958",
    homeUrl: `https://${publicHost || channel.primaryHost}/`,
    host: publicHost || channel.primaryHost,
    isMuchi: false,
    isDirectory: true,
    directoryName,
  };
}

export async function legalMetadata(title, description, path) {
  const context = await getLegalSiteContext();
  const canonical = new URL(path, context.homeUrl).toString();
  return {
    title: `${title} | ${context.name}`,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { title: `${title} | ${context.name}`, description, url: canonical, type: "website", siteName: context.name },
  };
}
