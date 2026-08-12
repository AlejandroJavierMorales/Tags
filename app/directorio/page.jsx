import Link from "next/link";
import { headers } from "next/headers";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryCategoryGrid from "@/app/modules/directory/components/public/DirectoryCategoryGrid";
import DirectoryListingGrid from "@/app/modules/directory/components/public/DirectoryListingGrid";
import DirectoryTourismShortcuts from "@/app/modules/directory/components/public/DirectoryTourismShortcuts";
import DirectoryFeaturedListings from "@/app/modules/directory/components/public/DirectoryFeaturedListings";
import DirectoryResultsMap from "@/app/modules/directory/components/public/DirectoryResultsMap";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";
import DirectoryResultsHeading from "@/app/modules/directory/components/public/DirectoryResultsHeading";
import DirectoryLocalityFilter from "@/app/modules/directory/components/public/DirectoryLocalityFilter";
import { getDirectoryPublicData, getDirectorySiteByCode, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import "./directoryPublicPage.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentSiteCode() {
  const requestHeaders = await headers();
  return getDirectorySiteCodeByHost(requestHeaders.get("host"));
}

export async function generateMetadata() {
  const site = await getDirectorySiteByCode(await currentSiteCode());
  if (!site) return { title: "Directorio comercial" };
  return {
    title: `Comercios y servicios | ${site.name}`,
    description: `Encontrá comercios, profesionales, productos y servicios en ${site.name}.`
  };
}

function href(filters, overrides = {}) {
  const values = { q: filters.query, categoria: filters.categoryId || "", localidad: filters.localityId || "", pagina: filters.page, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, String(value));
  const query = params.toString();
  return query ? `/directorio?${query}` : "/directorio";
}

export default async function DirectoryPublicPage({ searchParams }) {
  const filters = await Promise.resolve(searchParams || {});
  const data = await getDirectoryPublicData(filters, await currentSiteCode());
  if (!data) return <main className="tags_directory_unavailable"><h1>Directorio no disponible</h1><p>El canal solicitado todavía no está activo.</p></main>;

  const categoryTitle = data.selectedCategory ? `Dentro de ${data.selectedCategory.name}` : "Rubros y categorías";
  const resultsTitle = data.selectedCategory ? `Prestadores de ${data.selectedCategory.name}` : data.filters.query ? `Resultados para “${data.filters.query}”` : "Prestadores destacados";
  const isHome = !data.filters.categoryId && !data.filters.localityId && !data.filters.query;
  const returnHref = `${href(data.filters)}#resultados`;
  const navigationTrail = [{ label: "Inicio", href: "/directorio" }, ...data.breadcrumbs.map(item => ({ label: item.name, href: href(data.filters, { categoria: item.id, pagina: 1 }) }))];
  if (!data.breadcrumbs.length && data.filters.query) navigationTrail.push({ label: `Resultados para “${data.filters.query}”`, href: returnHref });

  return <main className="tags_directory_page">
    <DirectoryPublicHeader site={data.site} query={data.filters.query} compact={!isHome} />
    <div className="tags_directory_content">
      {isHome && data.site.code === "calamuchitar" && <DirectoryTourismShortcuts />}
      {data.breadcrumbs.length > 0 && <nav className="tags_directory_breadcrumb" aria-label="Navegación de categorías">
        <Link href="/directorio">Inicio</Link>
        {data.breadcrumbs.map(item => <span key={item.id}><b>/</b><Link href={href(data.filters, { categoria: item.id, pagina: 1 })} scroll={false}>{item.name}</Link></span>)}
      </nav>}

      <DirectoryCategoryGrid categories={data.categories} title={categoryTitle} />

      {isHome
        ? <DirectoryFeaturedListings listings={data.featuredListings} />
        : <section className="tags_directory_results" id="resultados" style={{ scrollMarginTop: "100px" }} aria-labelledby="directory-results-title">
          <div className="tags_directory_results_header">
            <DirectoryResultsHeading title={resultsTitle} total={data.pagination.total} navigationKey={`${data.filters.query}|${data.filters.categoryId}|${data.filters.localityId}|${data.filters.page}`} />
            <div className="tags_directory_results_controls"><DirectoryLocalityFilter localities={data.localities} query={data.filters.query} categoryId={data.filters.categoryId} localityId={data.filters.localityId} /><DirectoryResultsMap listings={data.mapListings} apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""} mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"} /></div>
          </div>
          <DirectoryListingGrid listings={data.listings} returnHref={returnHref} navigationTrail={navigationTrail} />
          {data.pagination.totalPages > 1 && <nav className="tags_directory_pagination" aria-label="Páginas de resultados">
            {data.pagination.page > 1 ? <Link href={href(data.filters, { pagina: data.pagination.page - 1 })} scroll={false}><FaChevronLeft /> Anterior</Link> : <span />}
            <strong>Página {data.pagination.page} de {data.pagination.totalPages}</strong>
            {data.pagination.page < data.pagination.totalPages ? <Link href={href(data.filters, { pagina: data.pagination.page + 1 })} scroll={false}>Siguiente <FaChevronRight /></Link> : <span />}
          </nav>}
        </section>}

      {isHome && <section className="tags_directory_commercial_intro">
        <div><span>UNA PLATAFORMA COMERCIAL</span><h2>{data.site.name} conecta personas, comercios y servicios</h2><p>Ayudamos a encontrar lo que necesitás y brindamos a cada negocio herramientas para crecer y ofrecer sus productos y servicios en internet.</p></div>
        <aside><strong>¿Tenés un comercio o prestás un servicio?</strong><p>Publicá tu actividad y accedé a una web propia, catálogo, carta online, turnos, reseñas y más herramientas de Tags.</p><a href="/login">Publicar mi negocio</a></aside>
      </section>}
    </div>
    <DirectoryPublicFooter site={data.site} />
  </main>;
}
