import Link from "next/link";
import { notFound } from "next/navigation";
import { FaArrowRight, FaCompass } from "react-icons/fa6";
import Ruta100TerritorialShell from "@/app/modules/destination-corridor/components/public/Ruta100TerritorialShell";
import Ruta100ExperienceIcon from "@/app/modules/destination-corridor/components/public/Ruta100ExperienceIcon";
import { resolveRuta100PublicPage, ruta100Robots } from "@/app/modules/destination-corridor/server/resolveRuta100PublicPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const data = await resolveRuta100PublicPage();
  if (!data) return { title: "Experiencias no disponibles", robots: { index: false, follow: false } };
  return {
    title: "Experiencias de Ruta 100 Córdoba | Diez maneras de recorrerla",
    description: "Naturaleza, deporte, vino, cultura, senderismo, golf, turismo religioso, motorhomes, parques y el Camino de Brochero.",
    alternates: { canonical: `${data.baseUrl}/experiencias` },
    robots: ruta100Robots(data),
  };
}

export default async function Ruta100ExperiencesPage() {
  const data = await resolveRuta100PublicPage();
  if (!data) notFound();

  return (
    <Ruta100TerritorialShell site={data.site} active="experiences">
      <article className="ruta100_experiences_page">
        {data.fullyPublished ? null : <div className="ruta100_preview_notice">Vista previa editorial · contenido en preparación</div>}
        <header className="ruta100_experiences_hero">
          <div className="ruta100_experiences_hero_inner">
            <div><span>VIVÍ EL CAMINO A TU MANERA</span><h1>Diez experiencias.<br />Una Córdoba inmensa.</h1><p>Elegí lo que te inspira y empezá a descubrir los pueblos, paisajes y propuestas que se conectan a lo largo de Ruta 100.</p></div>
            <FaCompass />
          </div>
        </header>

        <section className="ruta100_experiences_grid">
          {data.experiences.map((experience, index) => (
            <Link href={`/experiencias/${experience.slug}`} key={experience.id}>
              <span className="ruta100_experience_index">{String(index + 1).padStart(2, "0")}</span>
              <div className="ruta100_experience_icon"><Ruta100ExperienceIcon code={experience.code} /></div>
              <h2>{experience.name}</h2>
              <p>{experience.summary}</p>
              <strong>Explorar <FaArrowRight /></strong>
            </Link>
          ))}
        </section>

        <section className="ruta100_experiences_cta"><div><span>536 KM PARA ELEGIR</span><h2>¿Preferís empezar por el camino?</h2><p>Conocé el recorrido general y sus portales de ingreso.</p></div><Link href="/recorrido">Ver recorrido <FaArrowRight /></Link></section>
      </article>
    </Ruta100TerritorialShell>
  );
}
