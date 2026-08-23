import { FaBars, FaBriefcase, FaGaugeHigh, FaHouse, FaMagnifyingGlass, FaRightFromBracket, FaRightToBracket, FaTag, FaXmark } from "react-icons/fa6";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { verifyTagsSession } from "@/app/lib/signTagsSession";
import { canBusinessAccessChannel } from "@/app/lib/channelContext";
import DirectorySearchForm from "./DirectorySearchForm";
import "./DirectoryPublicHeader.css";
import "./DirectoryPublicHeaderChannels.css";
import "./DirectoryVisualOverrides.css";
import "./DirectoryPublicHeaderBenefits.css";

export default async function DirectoryPublicHeader({ site, query = "", compact = true, showSearch = true }) {
  const cookieStore = cookies();
  const sessionValue = cookieStore.get("tags_session")?.value || "";
  const sessionSignature = cookieStore.get("tags_session_sig")?.value || "";
  let session = null;
  try {
    if (sessionValue && sessionSignature && verifyTagsSession(sessionValue, sessionSignature)) session = JSON.parse(sessionValue);
  } catch { session = null; }
  const authenticated = session?.role === "admin"
    ? Boolean(site?.code === "tags")
    : Boolean(session?.businessId && await canBusinessAccessChannel({
      businessId: session.businessId,
      channel: { siteId: site?.id, isTags: site?.code === "tags" },
    }));
  const panelHref = session?.role === "admin" ? "/dashboard" : `/dashboard/businesses/${session?.businessId}`;
  const isCalamuchitar = site.code === "calamuchitar";
  const territoryName = isCalamuchitar ? "Calamuchita" : site.name;
  let searchContent = null;

  if (compact) {
    searchContent = <div className="tags_directory_compact_search">{showSearch && <DirectorySearchForm initialQuery={query} variant="compact" />}</div>;
  } else if (showSearch && !compact) {
    searchContent = <section className={`tags_directory_commercial_hero${isCalamuchitar ? "" : " is_generic"}`}>
      {isCalamuchitar && <Image src="/directory/calamuchitar/fondo-principal-lg.webp" alt="" fill priority sizes="100vw" className="tags_directory_hero_background" />}
      <div className="tags_directory_hero_overlay" />
      <div className="tags_directory_hero_content">
        <span>COMERCIOS · SERVICIOS · PROFESIONALES</span>
        <h1>Todo {territoryName}<br />en un solo lugar</h1>
        <p>Encontrá comercios, profesionales, productos y servicios del área.</p>
        <DirectorySearchForm initialQuery={query} variant="hero" />
        <div className="tags_directory_hero_actions"><a href="#rubros">Explorar rubros</a><Link href="/beneficios" className="is_benefits"><FaTag /> Beneficios</Link><Link href="/publicar-mi-negocio">Publicar mi negocio</Link></div>
      </div>
    </section>;
  }

  return <>
    <header className="tags_directory_topbar">
      <div className="tags_directory_topbar_inner">
        <Link href="/directorio" className="tags_directory_identity" aria-label={`Inicio de ${site.name}`}>
          {isCalamuchitar ? <Image src="/directory/calamuchitar/LogoCalamuchitar.webp" alt="CalamuchitAr" width={250} height={70} sizes="(max-width: 520px) 174px, 250px" /> : <strong>{site.name}</strong>}
          <span>{isCalamuchitar ? "La Plataforma Comercial de Calamuchita" : "Plataforma Comercial"}</span>
        </Link>
        <nav className="tags_directory_desktop_nav" aria-label="Navegación principal">
          <Link href="/directorio"><FaHouse /> Inicio</Link>
          <a href="#rubros"><FaMagnifyingGlass /> Explorar</a>
          <Link href="/publicar-mi-negocio"><FaBriefcase /> Publicar mi negocio</Link>
          {authenticated ? <><a href={panelHref} className="is_login"><FaGaugeHigh /> Mi Panel</a><a href="/logout" className="is_logout"><FaRightFromBracket /> Cerrar sesión</a></> : <Link href="/login" className="is_login"><FaRightToBracket /> Ingresar</Link>}
        </nav>
        <details className="tags_directory_mobile_nav">
          <summary><FaBars className="is_open" /><FaXmark className="is_close" /><span className="sr_only">Abrir menú</span></summary>
          <nav>
            <div className="tags_directory_drawer_brand"><Image src="/directory/calamuchitar/LogoCalamuchitar.webp" alt="CalamuchitAr" width={210} height={70} sizes="210px" /><span>La Plataforma Comercial de Calamuchita</span></div>
            <div className="tags_directory_drawer_links"><Link href="/directorio"><FaHouse /> Inicio</Link><a href="#rubros"><FaMagnifyingGlass /> Explorar rubros</a><Link href="/publicar-mi-negocio"><FaBriefcase /> Publicar mi negocio</Link>{authenticated && <a href={panelHref}><FaGaugeHigh /> Mi Panel</a>}</div>
            {authenticated ? <a href="/logout" className="tags_directory_drawer_login"><FaRightFromBracket /> Cerrar sesión</a> : <Link href="/login" className="tags_directory_drawer_login"><FaRightToBracket /> Ingresar</Link>}
          </nav>
        </details>
      </div>
    </header>
    {searchContent}
  </>;
}
