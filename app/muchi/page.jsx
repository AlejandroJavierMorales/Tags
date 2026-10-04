import { headers } from "next/headers";
import ChatWidget from "@/app/modules/ai-chat/components/ChatWidget";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getDirectorySiteByCode, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDestinationAssistantConfig } from "@/app/modules/destination-ai/config/getDestinationAssistantConfig";
import { applyDestinationUsagePolicy } from "@/app/modules/destination-ai/server/getDestinationUsageState";
import { getDestinationMapPoints } from "@/app/modules/destination-ai/server/getDestinationMapPoints";
import DirectoryResultsMap from "@/app/modules/directory/components/public/DirectoryResultsMap";
import DirectoryInstallPrompt from "@/app/modules/directory/components/public/DirectoryInstallPrompt";
import MuchiLandingActions from "./MuchiLandingActions";
import MuchiGreeting from "./MuchiGreeting";
import "./muchi.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MUCHI_URL = "https://muchi.calamuchita.ar/";
const MUCHI_TITLE = "Muchi | Asistente virtual de comercio y turismo de Calamuchita";
const MUCHI_DESCRIPTION = "Conversá con Muchi para encontrar alojamientos, restaurantes, comercios, productos, servicios, paseos y experiencias turísticas en el Valle de Calamuchita.";
const MUCHI_IMAGE = "/assets/destination-ai/muchi/icons/muchi-icon-512.png";

async function getSite() {
  const requestHeaders = await headers();
  const host = getHeadersHost(requestHeaders).replace(/^muchi\./, "");
  return getDirectorySiteByCode(await getDirectorySiteCodeByHost(host));
}

export async function generateMetadata() {
  return {
    metadataBase: new URL(MUCHI_URL),
    title: MUCHI_TITLE,
    description: MUCHI_DESCRIPTION,
    applicationName: "Muchi",
    keywords: [
      "asistente virtual de Calamuchita",
      "turismo en Calamuchita",
      "comercios de Calamuchita",
      "qué hacer en Calamuchita",
      "Valle de Calamuchita",
      "Muchi",
    ],
    alternates: { canonical: MUCHI_URL },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: MUCHI_URL,
      siteName: "Muchi · CalamuchitAr",
      title: MUCHI_TITLE,
      description: MUCHI_DESCRIPTION,
      images: [{
        url: MUCHI_IMAGE,
        width: 512,
        height: 512,
        alt: "Muchi, asistente virtual de comercio y turismo de Calamuchita",
      }],
    },
    twitter: {
      card: "summary",
      title: MUCHI_TITLE,
      description: MUCHI_DESCRIPTION,
      images: [MUCHI_IMAGE],
    },
    manifest: "/muchi.webmanifest?v=1",
    icons: {
      icon: "/branding/favicons/calamuchitar.ico",
      shortcut: "/branding/favicons/calamuchitar.ico",
      apple: "/assets/destination-ai/muchi/icons/muchi-icon-192.png",
    },
  };
}

function getStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://calamuchita.ar/#organization",
        name: "CalamuchitAr",
        url: "https://calamuchita.ar/",
        logo: "https://calamuchita.ar/directory/calamuchitar/LogoCalamuchitar.webp",
      },
      {
        "@type": "WebSite",
        "@id": `${MUCHI_URL}#website`,
        url: MUCHI_URL,
        name: "Muchi",
        alternateName: "Asistente virtual de comercio y turismo de Calamuchita",
        description: MUCHI_DESCRIPTION,
        inLanguage: "es-AR",
        publisher: { "@id": "https://calamuchita.ar/#organization" },
      },
      {
        "@type": "WebApplication",
        "@id": `${MUCHI_URL}#application`,
        url: MUCHI_URL,
        name: "Muchi",
        alternateName: "Asistente virtual de comercio y turismo de Calamuchita",
        description: MUCHI_DESCRIPTION,
        applicationCategory: "TravelApplication",
        operatingSystem: "Web",
        browserRequirements: "Requiere un navegador web moderno",
        isAccessibleForFree: true,
        inLanguage: "es-AR",
        image: `${MUCHI_URL.replace(/\/$/, "")}${MUCHI_IMAGE}`,
        areaServed: {
          "@type": "Place",
          name: "Valle de Calamuchita, Córdoba, Argentina",
        },
        provider: { "@id": "https://calamuchita.ar/#organization" },
      },
    ],
  };
}

export default async function MuchiPage() {
  const site = await getSite();
  const [config, mapPoints] = await Promise.all([
    applyDestinationUsagePolicy(
      getDestinationAssistantConfig(site, { initialOpen: false, launcherPrompt: "", fullscreen: true }),
      site.code,
    ),
    getDestinationMapPoints(site.code),
  ]);
  const structuredData = JSON.stringify(getStructuredData()).replace(/</g, "\\u003c");

  return <main className="tags_muchi_page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
    <header className="tags_muchi_brand">
      <div><img src="/directory/calamuchitar/LogoCalamuchitar.webp" alt="CalamuchitAr" /><span>La Plataforma Comercial de Calamuchita</span></div>
      <nav><a href="https://calamuchita.ar/directorio">Explorar la Plataforma</a></nav>
    </header>
    <section className="tags_muchi_hero">
      <div className="tags_muchi_intro"><span>TU GUÍA PARA VIVIR Y RECORRER EL VALLE</span><MuchiGreeting /><p className="tags_muchi_lead">Tu asistente virtual de comercio y turismo en Calamuchita.</p><p>Decime qué necesitás: puedo encontrar un producto, un comercio o un servicio; recomendar dónde comer o alojarte; descubrir paseos y experiencias; y combinar varias ideas para organizar tu día.</p><MuchiLandingActions /><a className="tags_muchi_business_cta" href="https://calamuchita.ar/publicar-mi-negocio"><span className="tags_muchi_business_copy"><b>Quiero que Muchi conozca mi negocio y lo recomiende</b><small>Incorporá tu comercio o servicio a CalamuchitAr</small></span><span className="tags_muchi_business_button">Sumar mi negocio</span></a></div>
      <aside><div className="tags_muchi_compass">MUCHI</div><strong>Una conversación, todo Calamuchita.</strong><p>No hace falta que aprendas filtros ni categorías. Contame qué buscás, dónde estás y qué preferís. Si falta un dato importante, te voy a hacer una pregunta concreta.</p><div className="tags_muchi_profiles"><span><b>Respuestas útiles</b> Opciones reales con imagen, contacto, ubicación y distancia cuando esos datos están publicados.</span><span><b>Contexto que continúa</b> Podés preguntar varias cosas, comparar alternativas y seguir armando un paseo sin reiniciar.</span><span><b>Información responsable</b> Distingo negocios, productos, servicios y contenidos turísticos antes de recomendar.</span></div><p className="tags_muchi_context">Tengo en cuenta la localidad que pedís, tu ubicación si la compartís, el momento del día y las condiciones que me cuentes. El clima actual sólo se usa cuando existe una fuente habilitada.</p></aside>
    </section>
    {mapPoints.length > 0 && <section className="tags_muchi_map_access"><div><span>EXPLORÁ EL VALLE</span><h2>Todo lo que Muchi conoce, también en el mapa.</h2><p>Visualizá comercios, servicios, paseos y experiencias con ubicación pública.</p></div><DirectoryResultsMap listings={mapPoints} apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""} mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"} /></section>}
    <footer className="tags_muchi_mvp_notice"><p><strong>Muchi está en su primera versión funcional (MVP).</strong> Estamos ampliando y mejorando continuamente su base de conocimiento para ofrecerte respuestas cada vez más precisas, útiles y relevantes.</p><small>Muchi, el asistente virtual de comercio y turismo de Calamuchita, es una marca registrada de CalamuchitAr, la Plataforma Comercial de Calamuchita.</small><nav aria-label="Información legal"><a href="/politica-de-privacidad">Política de Privacidad</a><a href="/terminos-y-condiciones">Términos y Condiciones</a><a href="/gestion-de-datos">Gestión de datos</a></nav></footer>
    <DirectoryInstallPrompt appCode="muchi" title="Llevá a Muchi en tu celular" ariaLabel="Instalar Muchi" iconUrl="/assets/destination-ai/muchi/icons/muchi-icon-192.png" serviceWorkerUrl="/muchi-sw.js" pageSelector=".tags_muchi_page" />
    {config && <ChatWidget config={config} />}
  </main>;
}
