import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { FaArrowLeft, FaArrowRight, FaLocationDot, FaTag, FaWhatsapp } from "react-icons/fa6";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";
import { getDirectoryPublicBenefits, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getHeadersHost } from "@/app/lib/channelContext";
import { directoryImageUrl, directoryWhatsappUrl } from "@/app/modules/directory/lib/directoryPublicFormatting";
import { directoryBenefitLabel } from "@/app/modules/directory/lib/directoryBenefitFormatting";
import { getDirectoryChannelMetadata } from "@/app/lib/seo/publicSitemap";
import "./directoryBenefitsPage.css";
import "./directoryBenefitsPageOverrides.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return getDirectoryChannelMetadata({
    path: "/beneficios",
    title: "Beneficios",
    description: "Promociones vigentes de comercios y prestadores.",
    forceNoindex: true,
  });
}

function money(value) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function date(value) {
  const text = String(value || "").slice(0, 10);
  const [year, month, day] = text.split("-");
  return year && month && day ? `${day}/${month}/${year}` : text;
}

function buildBenefitsHref(filters, page) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.localityId) params.set("localidad", String(filters.localityId));
  if (filters.categoryId) params.set("categoria", String(filters.categoryId));
  params.set("pagina", String(page));
  return `/beneficios?${params.toString()}`;
}

export default async function DirectoryBenefitsPage({ searchParams }) {
  const requestHeaders = await headers();
  const siteCode = await getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
  const data = await getDirectoryPublicBenefits(await Promise.resolve(searchParams || {}), siteCode);
  if (!data) return <main className="tags_directory_unavailable"><h1>Beneficios no disponibles</h1></main>;

  const filters = data.filters;
  return <main className="tags_directory_benefits_page">
    <DirectoryPublicHeader site={data.site} compact showSearch={false} />
    <div className="tags_directory_benefits_content">
      <nav className="tags_directory_breadcrumb" aria-label="Navegación"><Link href="/directorio">Inicio</Link><span><b>/</b> Beneficios</span></nav>
      <header className="tags_directory_benefits_heading"><span>OPORTUNIDADES</span><h1><FaTag aria-hidden="true" /> Beneficios</h1><p>Promociones vigentes de comercios y prestadores.</p></header>
      <form className="tags_directory_benefits_filters" method="get">
        <label><span>Buscar</span><input name="q" defaultValue={filters.query} placeholder="Negocio, beneficio o actividad" /></label>
        <label><span>Localidad</span><select name="localidad" defaultValue={filters.localityId || ""}><option value="">Todas las localidades</option>{data.localities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Rubro</span><select name="categoria" defaultValue={filters.categoryId || ""}><option value="">Todos los rubros</option>{data.categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <button type="submit">Aplicar filtros</button>
        {!!(filters.query || filters.localityId || filters.categoryId) && <Link href="/directorio/beneficios">Limpiar</Link>}
      </form>
      {!data.benefits.length && <div className="tags_directory_benefits_empty"><FaTag /><strong>No hay beneficios con esos filtros.</strong><span>Probá con otra localidad, rubro o búsqueda.</span></div>}
      <section className="tags_directory_benefits_public_grid" aria-label="Beneficios publicados">
        {data.benefits.map(item => {
          const whatsapp = directoryWhatsappUrl(item.whatsapp);
          return <article className="tags_directory_benefit_public_card" key={item.id}>
            {item.image_url ? <Image src={directoryImageUrl(item.image_url)} alt="" width={420} height={240} sizes="(max-width: 700px) 100vw, 420px" /> : <div className="tags_directory_benefit_public_placeholder"><FaTag /></div>}
            <div className="tags_directory_benefit_public_body">
              <div className="tags_directory_benefit_public_meta">{item.category_name && <span>{item.category_name}</span>}{item.locality_name && <span><FaLocationDot /> {item.locality_name}</span>}</div>
              <h2>{item.name}</h2>
              <strong className="tags_directory_benefit_public_value">{directoryBenefitLabel(item)}</strong>
              <small>Válido del {date(item.valid_from)} al {date(item.valid_until)}</small>
              {item.description && <p>{item.description}</p>}
              <div className="tags_directory_benefit_public_actions"><Link href={`/${item.slug}`}>Ver Web <FaArrowRight /></Link>{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><FaWhatsapp /> WhatsApp</a>}</div>
              <footer>{item.business_name}</footer>
            </div>
          </article>;
        })}
      </section>
      {data.pagination.totalPages > 1 && <nav className="tags_directory_benefits_pagination" aria-label="Páginas de beneficios">{filters.page > 1 ? <Link href={buildBenefitsHref(filters, filters.page - 1)}><FaArrowLeft /> Anterior</Link> : <span /> }<strong>Página {filters.page} de {data.pagination.totalPages}</strong>{filters.page < data.pagination.totalPages ? <Link href={buildBenefitsHref(filters, filters.page + 1)}>Siguiente <FaArrowRight /></Link> : <span />}</nav>}
    </div>
    <DirectoryPublicFooter site={data.site} />
  </main>;
}
