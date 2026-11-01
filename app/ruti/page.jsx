import { headers } from "next/headers";
import ChatWidget from "@/app/modules/ai-chat/components/ChatWidget";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getDirectorySiteByCode, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDestinationAssistantConfig } from "@/app/modules/destination-ai/config/getDestinationAssistantConfig";
import { applyDestinationUsagePolicy } from "@/app/modules/destination-ai/server/getDestinationUsageState";
import RutiChatTrigger from "./RutiChatTrigger";
import "./ruti.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUTI_URL = "https://ruti.ruta100cordoba.com/";
const TITLE = "Ruti | Asistente virtual de Ruta 100 Córdoba";
const DESCRIPTION = "Conversá con Ruti para descubrir pueblos, paisajes, gastronomía, servicios y experiencias por la Ruta 100 de Córdoba.";

async function getSite() {
  const requestHeaders = await headers();
  const host = getHeadersHost(requestHeaders).replace(/^ruti\./, "");
  const siteCode = host === "tags.com.ar" || host.startsWith("localhost")
    ? "ruta100cordoba"
    : await getDirectorySiteCodeByHost(host);
  return getDirectorySiteByCode(siteCode);
}

export function generateMetadata() {
  return {
    metadataBase: new URL(RUTI_URL),
    title: TITLE,
    description: DESCRIPTION,
    applicationName: "Ruti",
    alternates: { canonical: RUTI_URL },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: RUTI_URL,
      siteName: "Ruti · Ruta 100 Córdoba",
      title: TITLE,
      description: DESCRIPTION,
      images: [{ url: "/assets/images/ruti/Ruti_1_idle_640x960.png", width: 640, height: 960, alt: "Ruti, asistente virtual de Ruta 100 Córdoba" }],
    },
    icons: {
      icon: "/assets/icons/Ruta100Cordoba_Favicon.ico",
      shortcut: "/assets/icons/Ruta100Cordoba_Favicon.ico",
    },
  };
}

export default async function RutiPage() {
  const site = await getSite();
  const config = await applyDestinationUsagePolicy(
    getDestinationAssistantConfig(site, { initialOpen: false, launcherPrompt: "", fullscreen: true }),
    site.code,
  );

  return <main className="tags_ruti_page">
    <header className="tags_ruti_brand">
      <a href="https://ruta100cordoba.com" aria-label="Ir a Ruta 100 Córdoba"><img src="/assets/icons/Ruta100Cordoba_512.png" alt="Ruta 100 Córdoba" /></a>
      <a href="https://ruta100cordoba.com">Explorar Ruta 100 Córdoba</a>
    </header>
    <section className="tags_ruti_hero">
      <div className="tags_ruti_headline">
        <span>DESCUBRÍ TODA LA MAGIA DE CÓRDOBA POR LA RUTA 100</span>
        <h1><span>Hola, soy</span><strong>Ruti</strong></h1>
      </div>
      <img src="/assets/images/ruti/Ruti_1_idle_640x960.png" alt="Ruti, el puma de Ruta 100 Córdoba" />
      <div className="tags_ruti_copy">
        <p>Tu compañero para descubrir pueblos, paisajes, gastronomía, servicios y experiencias.</p>
        <RutiChatTrigger />
      </div>
    </section>
    <footer className="tags_ruti_footer">
      <p><strong>Ruti está en su primera versión funcional.</strong> Estamos ampliando continuamente su conocimiento para ofrecer respuestas cada vez más útiles sobre los pueblos, paisajes y experiencias de Ruta 100 Córdoba.</p>
      <small>Ruti es el asistente virtual de Ruta 100 Córdoba. Sus respuestas se generan con inteligencia artificial a partir de la información disponible en la plataforma.</small>
      <nav aria-label="Información legal"><a href="/politica-de-privacidad">Política de Privacidad</a><a href="/terminos-y-condiciones">Términos y Condiciones</a><a href="/gestion-de-datos">Gestión de datos</a></nav>
    </footer>
    {config && <ChatWidget config={config} />}
  </main>;
}
