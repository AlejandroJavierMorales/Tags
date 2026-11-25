import Link from "next/link";
import { notFound } from "next/navigation";
import { FaArrowLeft, FaArrowRight, FaRoute, FaStore } from "react-icons/fa6";
import Ruta100TerritorialShell from "@/app/modules/destination-corridor/components/public/Ruta100TerritorialShell";
import Ruta100ExperienceIcon from "@/app/modules/destination-corridor/components/public/Ruta100ExperienceIcon";
import { resolveRuta100PublicPage, ruta100Robots } from "@/app/modules/destination-corridor/server/resolveRuta100PublicPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const values = await Promise.resolve(params);
  const data = await resolveRuta100PublicPage(values.slug);
  if (!data) return { title: "Experiencia no disponible", robots: { index: false, follow: false } };
  const published = data.fullyPublished && data.experience.status === "published";
  return {
    title: data.experience.seo_title || `${data.experience.name} | Ruta 100 Córdoba`,
    description: data.experience.seo_description || data.experience.summary,
    alternates: { canonical: `${data.baseUrl}/experiencias/${data.experience.slug}` },
    robots: ruta100Robots({ fullyPublished: published }),
  };
}

export default async function Ruta100ExperiencePage({ params }) {
  const values = await Promise.resolve(params);
  const data = await resolveRuta100PublicPage(values.slug);
  if (!data) notFound();
  const currentIndex = data.experiences.findIndex((item) => item.id === data.experience.id);
  const next = data.experiences[(currentIndex + 1) % data.experiences.length];

  return (
    <Ruta100TerritorialShell site={data.site} active="experiences">
      <article className="ruta100_experience_page">
        {data.experience.status !== "published" && <div className="ruta100_preview_notice">Vista previa editorial · contenido en preparación</div>}
        <nav className="ruta100_experience_breadcrumb"><Link href="/experiencias"><FaArrowLeft /> Todas las experiencias</Link><span>/</span><strong>{data.experience.name}</strong></nav>
        <header className="ruta100_experience_hero">
          <div className="ruta100_experience_hero_icon"><Ruta100ExperienceIcon code={data.experience.code} /></div>
          <div><span>EXPERIENCIA {String(currentIndex + 1).padStart(2, "0")}</span><h1>{data.experience.name}</h1><p>{data.experience.summary}</p></div>
        </header>
        <section className="ruta100_experience_body">
          <div><span>DESCUBRÍ RUTA 100</span><h2>Una experiencia para vivir Córdoba desde el camino</h2><p>{data.experience.description || data.experience.summary}</p></div>
          <aside><strong>Esta propuesta forma parte del recorrido oficial Ruta 100 Córdoba.</strong><p>Próximamente incorporará localidades, atractivos y prestadores vinculados con información verificada.</p></aside>
        </section>
        <section className="ruta100_experience_actions"><Link href="/recorrido"><FaRoute /> Ver el recorrido</Link><Link href="/directorio"><FaStore /> Buscar prestadores</Link></section>
        {next && next.id !== data.experience.id && <Link className="ruta100_experience_next" href={`/experiencias/${next.slug}`}><span>Siguiente experiencia</span><strong>{next.name} <FaArrowRight /></strong></Link>}
        <footer className="ruta100_public_source"><span>Fuente de información consultada para elaborar este contenido.</span>{data.experience.source_url && <a href={data.experience.source_url} target="_blank" rel="noreferrer">Ver fuente externa: {data.experience.source_name || "Agencia Córdoba Turismo"}</a>}</footer>
      </article>
    </Ruta100TerritorialShell>
  );
}
