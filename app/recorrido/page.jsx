import Link from "next/link";
import { notFound } from "next/navigation";
import { FaArrowRight, FaFlagCheckered, FaLocationDot, FaRoute } from "react-icons/fa6";
import Ruta100TerritorialShell from "@/app/modules/destination-corridor/components/public/Ruta100TerritorialShell";
import Ruta100ExperienceIcon from "@/app/modules/destination-corridor/components/public/Ruta100ExperienceIcon";
import { resolveRuta100PublicPage, ruta100Robots } from "@/app/modules/destination-corridor/server/resolveRuta100PublicPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const data = await resolveRuta100PublicPage();
  if (!data) return { title: "Recorrido no disponible", robots: { index: false, follow: false } };
  return {
    title: `Recorrido de Ruta 100 Córdoba | ${Number(data.corridor.distance_km || 536).toLocaleString("es-AR")} km para descubrir`,
    description: data.corridor.summary,
    alternates: { canonical: `${data.baseUrl}/recorrido` },
    robots: ruta100Robots(data),
  };
}

export default async function Ruta100RoutePage() {
  const data = await resolveRuta100PublicPage();
  if (!data) notFound();
  const distance = Number(data.corridor.distance_km || 536).toLocaleString("es-AR");

  return (
    <Ruta100TerritorialShell site={data.site} active="route">
      <article className="ruta100_route_page">
        {data.corridor.status !== "published" && <div className="ruta100_preview_notice">Vista previa editorial · contenido en preparación</div>}
        <header className="ruta100_route_hero">
          <div className="ruta100_route_hero_inner">
            <div className="ruta100_route_hero_copy">
              <span>{data.corridor.eyebrow || "LA SÍNTESIS PERFECTA DEL TURISMO CORDOBÉS"}</span>
              <h1>{data.corridor.name}</h1>
              <p>{data.corridor.summary}</p>
              <div className="ruta100_route_actions"><Link href="/experiencias">Descubrir experiencias <FaArrowRight /></Link><Link href="/mapa" className="secondary">Explorar el mapa</Link></div>
            </div>
            <div className="ruta100_route_number"><strong>{distance}</strong><span>kilómetros<br />de experiencias</span></div>
          </div>
        </header>

        <section className="ruta100_route_axis" aria-label="Extremos del recorrido">
          <article><FaLocationDot /><span>Portal norte</span><strong>Cruz del Eje</strong></article>
          <div><span /><FaRoute /><span /></div>
          <article><FaFlagCheckered /><span>Portal sur</span><strong>Río Cuarto</strong></article>
        </section>

        <section className="ruta100_route_story">
          <div><span>EL CAMINO ES PARTE DEL VIAJE</span><h2>Una nueva manera de descubrir Córdoba</h2></div>
          <p>{data.corridor.description || data.corridor.summary}</p>
          <aside><strong>Más de 50</strong><span>localidades y comunas conectadas por paisajes, historias y experiencias.</span></aside>
        </section>

        <section className="ruta100_route_experiences">
          <header><div><span>DIEZ PROPUESTAS</span><h2>Elegí cómo vivir la Ruta 100</h2></div><Link href="/experiencias">Ver todas <FaArrowRight /></Link></header>
          <div>{data.experiences.slice(0, 5).map((experience) => <Link href={`/experiencias/${experience.slug}`} key={experience.id}><Ruta100ExperienceIcon code={experience.code} /><span>{experience.name}</span></Link>)}</div>
        </section>

        <footer className="ruta100_public_source">
          <span>Fuente de información consultada para elaborar este contenido.</span>
          {data.corridor.source_url && <a href={data.corridor.source_url} target="_blank" rel="noreferrer">Ver fuente externa: {data.corridor.source_name || "Agencia Córdoba Turismo"}</a>}
        </footer>
      </article>
    </Ruta100TerritorialShell>
  );
}
