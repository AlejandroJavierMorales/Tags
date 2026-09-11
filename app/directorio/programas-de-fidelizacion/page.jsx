import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { FaArrowLeft, FaArrowRight, FaAward, FaGift, FaLocationDot } from "react-icons/fa6";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";
import { getDirectoryPublicLoyaltyPrograms, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getHeadersHost } from "@/app/lib/channelContext";
import { directoryImageUrl } from "@/app/modules/directory/lib/directoryPublicFormatting";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";
import "../beneficios/directoryBenefitsPage.css";
import "./directoryLoyaltyProgramsPage.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return getDirectoryChannelMetadata({ path: "/programas-de-fidelizacion", title: "Programas de fidelización", description: "Comercios y prestadores con programas de puntos, sellos, visitas y recompensas." });
}

function href(filters, page) { const params = new URLSearchParams(); if (filters.query) params.set("q", filters.query); if (filters.localityId) params.set("localidad", String(filters.localityId)); if (filters.categoryId) params.set("categoria", String(filters.categoryId)); if (filters.mechanic) params.set("modalidad", filters.mechanic); params.set("pagina", String(page)); return `/programas-de-fidelizacion?${params}`; }
const mechanicLabel = value => value === "stamps" ? "Programa de sellos" : value === "visits" ? "Programa de visitas" : "Programa de puntos";

export default async function DirectoryLoyaltyProgramsPage({ searchParams }) {
  const requestHeaders = await headers();
  const siteCode = await getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
  const data = await getDirectoryPublicLoyaltyPrograms(await Promise.resolve(searchParams || {}), siteCode);
  if (!data) return <main className="tags_directory_unavailable"><h1>Programas no disponibles</h1></main>;
  const filters = data.filters;
  return <main className="tags_directory_benefits_page tags_directory_loyalty_programs_page">
    <DirectoryPublicHeader site={data.site} compact showSearch={false} />
    <div className="tags_directory_benefits_content">
      <nav className="tags_directory_breadcrumb" aria-label="Navegación"><Link href="/directorio">Inicio</Link><span><b>/</b> Beneficios y Recompensas</span></nav>
      <nav className="tags_directory_benefits_tabs" aria-label="Beneficios y recompensas"><Link href="/programas-de-fidelizacion" aria-current="page" className="is_active"><FaAward /> Beneficios y Recompensas</Link><Link href="/beneficios"><FaGift /> Descuentos y Promociones</Link></nav>
      <header className="tags_directory_benefits_heading"><span>COMERCIOS ADHERIDOS</span><h1><FaAward /> Beneficios y Recompensas</h1><p>Elegí tus comercios favoritos, participá y accedé a recompensas.</p></header>
      <form className="tags_directory_benefits_filters" method="get">
        <label><span>Buscar</span><input name="q" defaultValue={filters.query} placeholder="Negocio, programa o actividad" /></label>
        <label><span>Localidad</span><select name="localidad" defaultValue={filters.localityId || ""}><option value="">Todas</option>{data.localities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Rubro</span><select name="categoria" defaultValue={filters.categoryId || ""}><option value="">Todos</option>{data.categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Modalidad</span><select name="modalidad" defaultValue={filters.mechanic}><option value="">Todas</option><option value="points">Puntos</option><option value="stamps">Sellos</option><option value="visits">Visitas</option></select></label>
        <button type="submit">Aplicar filtros</button>
        {!!(filters.query || filters.localityId || filters.categoryId || filters.mechanic) && <Link href="/programas-de-fidelizacion">Limpiar</Link>}
      </form>
      {!data.programs.length && <div className="tags_directory_benefits_empty"><FaGift /><strong>No hay programas con esos filtros.</strong><span>Probá otra localidad, rubro o búsqueda.</span></div>}
      <section className="tags_directory_loyalty_public_grid" aria-label="Programas publicados">{data.programs.map(program => <article className="tags_directory_loyalty_public_card" key={program.id}>
        <div className="tags_directory_loyalty_public_logo">{program.logo_url ? <Image src={directoryImageUrl(program.logo_url)} alt={`Logo de ${program.business_name}`} width={120} height={120} /> : <FaAward />}</div>
        <div><div className="tags_directory_benefit_public_meta">{program.category_name && <span>{program.category_name}</span>}{program.locality_name && <span><FaLocationDot /> {program.locality_name}</span>}</div><small>{mechanicLabel(program.mechanic)}</small><h2>{program.name}</h2><h3>{program.business_name}</h3>{program.description && <p>{program.description}</p>}<strong><FaGift /> {Number(program.reward_count)} recompensa{Number(program.reward_count) === 1 ? "" : "s"}</strong><div className="tags_directory_benefit_public_actions"><Link href={`/mi-cuenta/fidelizacion/programa/${program.id}`}>Ver programa <FaArrowRight /></Link><Link href={`/${program.slug}`}>Ver Web</Link></div></div>
      </article>)}</section>
      {data.pagination.totalPages > 1 && <nav className="tags_directory_benefits_pagination" aria-label="Páginas">{filters.page > 1 ? <Link href={href(filters, filters.page - 1)}><FaArrowLeft /> Anterior</Link> : <span /> }<strong>Página {filters.page} de {data.pagination.totalPages}</strong>{filters.page < data.pagination.totalPages ? <Link href={href(filters, filters.page + 1)}>Siguiente <FaArrowRight /></Link> : <span />}</nav>}
    </div>
    <DirectoryPublicFooter site={data.site} />
  </main>;
}
