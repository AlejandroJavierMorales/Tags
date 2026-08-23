"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaArrowLeft, FaEye, FaGlobe, FaLink, FaPalette, FaPuzzlePiece, FaRobot, FaStore, FaUserPen } from "react-icons/fa6";
import MediaUploader from "@/app/components/MediaUploader";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import DirectoryStructureManager from "./DirectoryStructureManager";
import DirectoryCatalogManager from "./DirectoryCatalogManager";
import DirectoryCommerceVisualBuilder from "./DirectoryCommerceVisualBuilder";
import DirectoryBenefitsManager from "./DirectoryBenefitsManager";
import AiChatSurfaceSettings from "@/app/modules/ai-chat/components/admin/AiChatSurfaceSettings";
import "@/app/styles/qr-page.css";
import "./DirectoryWebBuilderClient.css";
import "./DirectoryWebBuilderSlug.css";
import "./DirectoryWebBuilderSlugLabels.css";

const TABS = [
  ["profile", "Web", FaUserPen],
  ["content", "Contenido", FaGlobe],
  ["catalog", "Catálogo", FaStore],
  ["modules", "Módulos", FaPuzzlePiece],
  ["benefits", "Beneficios", FaPuzzlePiece],
  ["design", "Diseño", FaPalette],
  ["preview", "Vista previa", FaEye],
  ["chatbot", "Chatbot", FaRobot]
];

async function responsePayload(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

export default function DirectoryWebBuilderClient({ businessId, qrCodeId, business, publicUrl, directoryData }) {
  const [qrPage, setQrPage] = useState(null);
  const [profile, setProfile] = useState(null);
  const [places, setPlaces] = useState([]);
  const [geo, setGeo] = useState({ countryId: "", provinceId: "", regionId: "", localityId: "" });
  const [tab, setTab] = useState("profile");
  const [busy, setBusy] = useState(true);
  const [themes, setThemes] = useState([]);
  const [pendingThemeId, setPendingThemeId] = useState(undefined);
  const [headerConfig, setHeaderConfig] = useState({});
  const [footerConfig, setFooterConfig] = useState({});
  const [globalStyles, setGlobalStyles] = useState({});
  const [moduleWeb, setModuleWeb] = useState(null);
  const [publicSlug, setPublicSlug] = useState("");

  async function load() {
    setBusy(true);
    try {
      const [pageResponse, profileResponse] = await Promise.all([
        fetch(`/api/qr-page/get-or-create?businessId=${businessId}&qrCodeId=${qrCodeId}`, { cache: "no-store" }),
        fetch(`/api/business/profile?businessId=${businessId}`, { cache: "no-store" })
      ]);
      const [pagePayload, profilePayload] = await Promise.all([responsePayload(pageResponse), responsePayload(profileResponse)]);
      if (!pageResponse.ok) throw new Error(pagePayload.error || "No se pudo cargar la Web");
      if (!profileResponse.ok) throw new Error(profilePayload.error || "No se pudo cargar el perfil del negocio");
      setQrPage(pagePayload.qrPage);
      setPublicSlug(pagePayload.qrPage?.page?.slug || "");
      const moduleResponse = await fetch(`/api/directory/client/modules?businessId=${businessId}&pageId=${pagePayload.qrPage?.page?.id}`, { cache: "no-store" });
      const modulePayload = await responsePayload(moduleResponse);
      if (!moduleResponse.ok) throw new Error(modulePayload.error || "No se pudieron cargar los módulos");
      setModuleWeb(modulePayload.web || null);
      setHeaderConfig(pagePayload.qrPage?.page?.header_config || {});
      setFooterConfig(pagePayload.qrPage?.page?.footer_config || {});
      setGlobalStyles(pagePayload.qrPage?.page?.global_styles || {});
      setProfile(profilePayload.business);
      setPlaces(profilePayload.places || []);
      const primaryId = Number(profilePayload.selectedPlaces?.find(item => item.relation_type === "location" && Number(item.is_primary))?.place_id || 0);
      const byId = new Map((profilePayload.places || []).map(place => [Number(place.id), place]));
      const locality = byId.get(primaryId), region = byId.get(Number(locality?.parent_id)), province = byId.get(Number(region?.parent_id)), country = byId.get(Number(province?.parent_id));
      setGeo({ countryId: country?.id ? String(country.id) : "", provinceId: province?.id ? String(province.id) : "", regionId: region?.id ? String(region.id) : "", localityId: locality?.id ? String(locality.id) : "" });
    } catch (error) {
      await showAlert({ title: "No se pudo cargar", text: error.message, icon: "error" });
    } finally { setBusy(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { fetch("/api/qr-page/themes/list", { cache: "no-store" }).then(responsePayload).then(payload => setThemes(payload.themes || [])).catch(() => setThemes([])); }, []);

  function profileField(field, value) {
    setProfile(current => ({ ...current, [field]: value }));
  }

  async function saveProfile() {
    if (!profile?.display_name?.trim() || !profile?.email?.trim()) return showAlert({ title: "Faltan datos", text: "Nombre público y email son obligatorios.", icon: "warning" });
    setBusy(true);
    try {
      const response = await fetch("/api/business/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId, displayName: profile.display_name, email: profile.email, phone: profile.phone,
          description: profile.description, logoUrl: profile.logo_url, coverUrl: profile.cover_url,
          whatsapp: profile.whatsapp, address: profile.address, postalCode: profile.postal_code,
          latitude: profile.latitude ?? "", longitude: profile.longitude ?? "", websiteUrl: profile.website_url,
          instagramUrl: profile.instagram_url, facebookUrl: profile.facebook_url, primaryPlaceId: geo.localityId
        })
      });
      const payload = await responsePayload(response);
      if (!response.ok) throw new Error(payload.error || "No se pudieron guardar los cambios");
      await load();
      await showAlert({ title: "Cambios guardados", icon: "success", timer: 1400 });
    } catch (error) {
      await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" });
    } finally { setBusy(false); }
  }

  async function publication(nextStatus) {
    setBusy(true);
    try {
      const response = await fetch(nextStatus === "published" ? "/api/qr-page/publish" : "/api/qr-page/unpublish", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, pageId: qrPage.page.id })
      });
      const payload = await responsePayload(response);
      if (!response.ok) throw new Error(payload.error || "No se pudo cambiar la publicación");
      await load();
      await showAlert({ title: nextStatus === "published" ? "Web publicada" : "Web despublicada", icon: "success", timer: 1400 });
    } catch (error) {
      await showAlert({ title: "No se pudo completar", text: error.message, icon: "error" });
    } finally { setBusy(false); }
  }

  async function savePublicSlug() {
    const slug = publicSlug.trim();
    if (slug.length < 3) return showAlert({ title: "Slug inválido", text: "Ingresá una ruta pública de al menos 3 caracteres.", icon: "warning" });
    setBusy(true);
    try {
      const response = await fetch("/api/portal/admin/pages/slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, pageId: qrPage.page.id, slug, confirmed: true })
      });
      const payload = await responsePayload(response);
      if (!response.ok) throw new Error(payload.error || "No se pudo cambiar el slug");
      await load();
      await showAlert({ title: "Slug actualizado", text: "La URL pública de la página fue actualizada.", icon: "success", timer: 1400 });
    } catch (error) {
      await showAlert({ title: "No se pudo cambiar el slug", text: error.message, icon: "error" });
    } finally { setBusy(false); }
  }

  async function applyTheme(themeId) {
    setBusy(true);
    try {
      const response = await fetch(themeId ? "/api/qr-page/themes/apply" : "/api/qr-page/themes/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, pageId: qrPage.page.id, ...(themeId ? { themeId } : {}) }) });
      const payload = await responsePayload(response);
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar el tema");
      setPendingThemeId(undefined);
      await load();
      await showAlert({ title: "Tema actualizado", icon: "success", timer: 1200 });
    } catch (error) { await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" }); }
    finally { setBusy(false); }
  }

  async function saveDesign() {
    setBusy(true);
    try {
      const response = await fetch("/api/directory/client/design", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, pageId: qrPage.page.id, headerConfig, footerConfig, globalStyles: { borderRadius: globalStyles.borderRadius || "12px" } }) });
      const payload = await responsePayload(response);
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar el diseño");
      await load();
      await showAlert({ title: "Diseño guardado", icon: "success", timer: 1200 });
    } catch (error) { await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" }); }
    finally { setBusy(false); }
  }

  if (busy && !qrPage) return <div className="tags_directory_web_loading"><TagsSpinner /></div>;
  if (!qrPage?.page) return <div className="tags_directory_web_loading">No se pudo cargar la Web.</div>;
  const page = qrPage.page;

  return <main className="tags_directory_web_admin">
    {busy && <div className="tags_directory_web_busy"><TagsSpinner /></div>}
    <header className="tags_directory_web_header">
      <div><FaGlobe /><span><small>DIRECTORIO</small><h1>Web de {business.display_name || business.name}</h1><p>La ficha pública y sus bloques se administran en un único lugar.</p></span></div>
      <nav>
        <Link href={`/dashboard/businesses/${businessId}`}><FaArrowLeft /> Volver</Link>
        {publicUrl && <a href={publicUrl} target="_blank" rel="noreferrer"><FaEye /> Ver Web</a>}
        <button type="button" className={page.status === "published" ? "is_unpublish" : "is_publish"} onClick={() => publication(page.status === "published" ? "draft" : "published")}>{page.status === "published" ? "Despublicar" : "Publicar"}</button>
      </nav>
    </header>

    <section className="tags_directory_web_slug_bar">
      <div className="tags_directory_web_slug_label"><FaLink aria-hidden="true" /><strong>URL pública de la Web</strong></div>
      <div><FaLink /><span><strong>URL pública de la Web</strong><small>Se conserva el contenido y se actualiza la ruta del Directorio.</small></span></div>
      <label><span>/</span><input value={publicSlug} onChange={event => setPublicSlug(event.target.value)} /></label>
      <button type="button" onClick={savePublicSlug} disabled={busy || publicSlug === page.slug}>Guardar slug</button>
    </section>

    <div className="tags_directory_web_tabs" role="tablist">{TABS.map(([key, label, Icon]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}><Icon /> {label}</button>)}</div>

    {tab === "profile" && <section className="tags_directory_web_panel">
      <div className="tags_directory_web_panel_title"><div><h2>Datos de la Web</h2><p>Esta información integra la ficha principal; no crea otra página.</p></div><button type="button" onClick={saveProfile}>Guardar cambios</button></div>
      <div className="tags_directory_web_form">
        <label><span>Nombre público</span><input value={profile?.display_name || ""} onChange={event => profileField("display_name", event.target.value)} /></label>
        <label><span>Email</span><input type="email" value={profile?.email || ""} onChange={event => profileField("email", event.target.value)} /></label>
        <label><span>Teléfono</span><input value={profile?.phone || ""} onChange={event => profileField("phone", event.target.value)} /></label>
        <label><span>WhatsApp</span><input value={profile?.whatsapp || ""} onChange={event => profileField("whatsapp", event.target.value)} /></label>
        <label className="wide"><span>Descripción</span><textarea value={profile?.description || ""} onChange={event => profileField("description", event.target.value)} /></label>
        <div className="tags_directory_web_location wide"><h3>Ubicación compartida</h3><p>La utilizan Directory y los demás módulos del negocio.</p><div>
          <label><span>País</span><select value={geo.countryId} onChange={event => setGeo({ countryId: event.target.value, provinceId: "", regionId: "", localityId: "" })}><option value="">Seleccionar</option>{places.filter(place => place.place_type === "country").map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
          <label><span>Provincia</span><select value={geo.provinceId} disabled={!geo.countryId} onChange={event => setGeo(current => ({ ...current, provinceId: event.target.value, regionId: "", localityId: "" }))}><option value="">Seleccionar</option>{places.filter(place => Number(place.parent_id) === Number(geo.countryId) && ["state","province"].includes(place.place_type)).map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
          <label><span>Región</span><select value={geo.regionId} disabled={!geo.provinceId} onChange={event => setGeo(current => ({ ...current, regionId: event.target.value, localityId: "" }))}><option value="">Seleccionar</option>{places.filter(place => Number(place.parent_id) === Number(geo.provinceId) && ["region","valley","department"].includes(place.place_type)).map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
          <label><span>Localidad</span><select value={geo.localityId} disabled={!geo.regionId} onChange={event => setGeo(current => ({ ...current, localityId: event.target.value }))}><option value="">Seleccionar</option>{places.filter(place => Number(place.parent_id) === Number(geo.regionId) && place.place_type === "locality").map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
        </div></div>
        <label className="wide"><span>Calle, número y referencia</span><input value={profile?.address || ""} onChange={event => profileField("address", event.target.value)} /></label>
        <label><span>Código postal</span><input value={profile?.postal_code || ""} onChange={event => profileField("postal_code", event.target.value)} /></label>
        <label><span>Latitud</span><input type="number" step="any" value={profile?.latitude ?? ""} onChange={event => profileField("latitude", event.target.value)} /></label>
        <label><span>Longitud</span><input type="number" step="any" value={profile?.longitude ?? ""} onChange={event => profileField("longitude", event.target.value)} /></label>
        <label><span>Sitio web</span><input value={profile?.website_url || ""} onChange={event => profileField("website_url", event.target.value)} /></label>
        <label><span>Instagram</span><input value={profile?.instagram_url || ""} onChange={event => profileField("instagram_url", event.target.value)} /></label>
        <label><span>Facebook</span><input value={profile?.facebook_url || ""} onChange={event => profileField("facebook_url", event.target.value)} /></label>
        <div className="tags_directory_web_upload"><span>Logo compartido</span><MediaUploader businessId={businessId} module="qr-page" variant="logo" entityId={page.id} value={profile?.logo_url || ""} onChange={media => profileField("logo_url", media?.url || "")} /></div>
        <div className="tags_directory_web_upload"><span>Portada compartida</span><MediaUploader businessId={businessId} module="qr-page" variant="hero" entityId={page.id} value={profile?.cover_url || ""} onChange={media => profileField("cover_url", media?.url || "")} /></div>
      </div>
    </section>}

    {tab === "content" && <section className="tags_directory_web_panel"><DirectoryStructureManager businessId={businessId} pageId={page.id} sections={qrPage.sections || []} onReload={load} /></section>}

    {tab === "catalog" && <section className="tags_directory_web_panel"><DirectoryCatalogManager businessId={businessId} pageId={page.id} products={qrPage.products || []} catalogSection={(qrPage.sections || []).find(section => section.blocks?.some(block => block.type === "catalog") || section.type === "catalog")} onReload={load} /></section>}

    {tab === "modules" && <section className="tags_directory_web_panel"><DirectoryCommerceVisualBuilder businessId={businessId} pageId={page.id} web={moduleWeb} onReload={load} /></section>}

    {tab === "benefits" && <section className="tags_directory_web_panel"><DirectoryBenefitsManager businessId={businessId} pageId={page.id} onReload={load} /></section>}

    {tab === "chatbot" && <section className="tags_directory_web_panel"><AiChatSurfaceSettings businessId={businessId} surfaceType="qr_page" surfaceId={page.id} surfaceLabel="la Página Web" /></section>}

    {tab === "design" && <section className="tags_directory_web_panel tags_directory_design_panel"><div className="tags_directory_web_panel_title"><div><h2>Diseño de la Web</h2><p>Elegí el tema y personalizá el encabezado y el footer.</p></div><button type="button" onClick={saveDesign}>Guardar diseño</button></div>
      <div className="tags_directory_theme_picker"><h3>Tema visual</h3><div><button type="button" className={!Number(pendingThemeId === undefined ? page.theme_id : pendingThemeId)?"active":""} onClick={()=>setPendingThemeId(null)}><span className="portal" /><b>Portal</b><small>Heredar</small></button>{themes.map(theme=>{const themeTokens=theme.css_tokens||{};const swatch=`linear-gradient(135deg,${themeTokens["--qr-bg"]||"#f6f8f7"} 0 42%,${themeTokens["--qr-surface"]||"#fff"} 42% 70%,${themeTokens["--qr-primary"]||"#26734f"} 70%)`;return <button type="button" key={theme.id} className={Number(pendingThemeId === undefined ? page.theme_id : pendingThemeId)===Number(theme.id)?"active":""} onClick={()=>setPendingThemeId(theme.id)}><span style={{background:swatch}} /><b>{theme.name}</b><small>{Number(page.theme_id)===Number(theme.id)?"Activo":"Seleccionar"}</small></button>})}</div>{pendingThemeId!==undefined&&<nav><button type="button" onClick={()=>setPendingThemeId(undefined)}>Cancelar</button><button type="button" onClick={()=>applyTheme(pendingThemeId)}>Guardar tema</button></nav>}</div>
      <div className="tags_directory_design_cards"><section><h3>Forma de los bloques</h3><p className="tags_directory_design_help">Aplicá un radio común a las secciones. El borde superior del encabezado y el inferior del footer permanecen rectos.</p><label>Radio general<select value={globalStyles.borderRadius||"12px"} onChange={event=>setGlobalStyles(current=>({...current,borderRadius:event.target.value}))}><option value="0px">Sin bordes redondeados</option><option value="8px">Sutil</option><option value="12px">Sobrio</option><option value="18px">Redondeado</option><option value="24px">Muy redondeado</option></select></label></section><section><h3>Encabezado</h3><div className="tags_directory_design_checks">{[["isVisible","Mostrar encabezado"],["showCover","Mostrar portada"],["showLogo","Mostrar logo"],["showName","Mostrar nombre"],["showLocation","Mostrar localidad"],["showMenu","Mostrar menú"]].map(([field,label])=><label key={field}><input type="checkbox" checked={headerConfig[field]!==false} onChange={event=>setHeaderConfig(current=>({...current,[field]:event.target.checked}))} />{label}</label>)}</div><label>Texto superior<input value={headerConfig.eyebrow||""} onChange={event=>setHeaderConfig(current=>({...current,eyebrow:event.target.value}))} /></label><label>Título personalizado<input value={headerConfig.title||""} onChange={event=>setHeaderConfig(current=>({...current,title:event.target.value}))} placeholder={profile?.display_name||""} /></label><label>Subtítulo<input value={headerConfig.subtitle||""} onChange={event=>setHeaderConfig(current=>({...current,subtitle:event.target.value}))} /></label><label>El menú mobile aparece desde<select value={headerConfig.drawerDirection||"right"} onChange={event=>setHeaderConfig(current=>({...current,drawerDirection:event.target.value}))}><option value="right">La derecha</option><option value="left">La izquierda</option><option value="top">Arriba</option><option value="bottom">Abajo</option></select></label></section>
      <section><h3>Footer</h3><div className="tags_directory_design_checks">{[["showFooter","Mostrar footer"],["showLogo","Mostrar logo"],["showBusinessName","Mostrar nombre"],["showDescription","Mostrar descripción"],["showContact","Mostrar contacto"],["showSocialLinks","Mostrar redes"]].map(([field,label])=><label key={field}><input type="checkbox" checked={footerConfig[field]!==false} onChange={event=>setFooterConfig(current=>({...current,[field]:event.target.checked}))} />{label}</label>)}</div><label>Título personalizado<input value={footerConfig.title||""} onChange={event=>setFooterConfig(current=>({...current,title:event.target.value}))} /></label><label>Texto del footer<textarea value={footerConfig.text||""} onChange={event=>setFooterConfig(current=>({...current,text:event.target.value}))} /></label><label>Título de contacto<input value={footerConfig.contactTitle||""} onChange={event=>setFooterConfig(current=>({...current,contactTitle:event.target.value}))} /></label><label>Título de redes<input value={footerConfig.socialTitle||""} onChange={event=>setFooterConfig(current=>({...current,socialTitle:event.target.value}))} /></label></section></div>
    </section>}

    {tab === "preview" && <section className="tags_directory_web_preview"><div className="tags_directory_web_panel_title"><div><h2>Vista previa completa</h2><p>Así se integra la ficha con todos los bloques y módulos habilitados.</p></div></div><iframe className="tags_directory_web_preview_frame" src={`/dashboard/businesses/${businessId}/directory/preview`} title="Vista previa completa de la Web" /></section>}
  </main>;
}
