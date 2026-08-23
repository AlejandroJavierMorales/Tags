"use client";

import { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaCheck, FaWhatsapp } from "react-icons/fa6";
import { normalizeArgentinaWhatsapp } from "@/app/modules/qr-page/lib/normalizeContactFields";
import "./PublicBusinessSignup.css";
import "./PublicBusinessSignupPayments.css";
import "./PublicBusinessSignupPaymentNotice.css";

const FEATURES = {
  directory_web: ["Web indexada", "Logo y presentación", "Secciones web", "Galería", "Contacto y redes", "Google Maps y cómo llegar", "Catálogo con categorías y precios", "Consultas por WhatsApp"],
  directory_web_plus: ["Todo Directorio Web", "Administrador de reseñas privadas y públicas", "Umbral para invitar a Google Reviews", "Moderación de reseñas visibles", "Métricas de calificaciones"]
};

function pathLabel(item, items) {
  const byId = new Map((items || []).map(entry => [String(entry.id), entry]));
  const parts = [item.name];
  let parent = byId.get(String(item.parent_id));
  while (parent) { parts.unshift(parent.name); parent = byId.get(String(parent.parent_id)); }
  return parts.join(" / ");
}

function parseBrand(site) {
  try { return typeof site?.brand_config === "string" ? JSON.parse(site.brand_config || "{}") : (site?.brand_config || {}); } catch { return {}; }
}

export default function PublicBusinessSignup() {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState("free");
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", whatsapp: "", description: "", address: "", placeId: "", taxonomyId: "", planId: "", logoUrl: "", logoStoragePath: "", latitude: "", longitude: "", paymentMethod: "manual", durationMonths: 12 });

  useEffect(() => { fetch("/api/directory/public/signup/options", { cache: "no-store" }).then(async response => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setData(payload); }).catch(err => setError(err.message || "No se pudo cargar la inscripción.")); }, []);

  const places = useMemo(() => (data?.places || []).filter(item => item.place_type === "locality").sort((a, b) => pathLabel(a, data.places).localeCompare(pathLabel(b, data.places), "es", { sensitivity: "base" })), [data]);
  const taxonomy = useMemo(() => { const all = data?.taxonomy || []; const parents = new Set(all.map(item => String(item.parent_id)).filter(Boolean)); return all.filter(item => !parents.has(String(item.id))).sort((a, b) => pathLabel(a, all).localeCompare(pathLabel(b, all), "es", { sensitivity: "base" })); }, [data]);
  const plans = useMemo(() => (data?.plans || []).filter(plan => mode === "free" ? Number(plan.is_free) === 1 : ["directory_web", "directory_web_plus"].includes(plan.code)), [data, mode]);
  const brand = useMemo(() => parseBrand(data?.site), [data]);
  const platformWhatsapp = normalizeArgentinaWhatsapp(brand.whatsapp || data?.contact?.whatsapp || brand.phone || data?.contact?.phone || "");
  const selectedPlan = plans.find(plan => String(plan.id) === String(form.planId));
  const paymentOptions = selectedPlan?.paymentOptions || [];
  const manualPaymentOptions = paymentOptions.filter(option => option.method === "manual");
  const automaticPaymentOption = paymentOptions.find(option => option.method === "mercadopago");
  const selectedPayment = paymentOptions.find(option => option.method === form.paymentMethod && Number(option.months) === Number(form.durationMonths)) || null;

  useEffect(() => { if (plans.length && !plans.some(plan => String(plan.id) === String(form.planId))) setForm(current => ({ ...current, planId: String(plans[0].id), paymentMethod: "manual", durationMonths: mode === "deferred" ? 12 : 1 })); }, [plans, form.planId, mode]);
  useEffect(() => {
    if (!selectedPlan || !paymentOptions.length || selectedPayment) return;
    const fallback = manualPaymentOptions[0] || automaticPaymentOption;
    if (fallback) setForm(current => ({ ...current, paymentMethod: fallback.method, durationMonths: fallback.months }));
  }, [automaticPaymentOption, manualPaymentOptions, paymentOptions.length, selectedPayment, selectedPlan]);
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const choosePayment = option => setForm(current => ({ ...current, paymentMethod: option.method, durationMonths: option.months }));

  async function uploadLogo(event) { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setError(""); setLogoBusy(true); try { const body = new FormData(); body.append("file", file); const response = await fetch("/api/directory/public/signup/logo", { method: "POST", body }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "No se pudo cargar el logo."); setForm(current => ({ ...current, logoUrl: payload.media?.url || "", logoStoragePath: payload.media?.storagePath || "" })); } catch (err) { setError(err.message); } finally { setLogoBusy(false); } }
  async function submit(event) {
    event.preventDefault();
    setError("");
    const nextErrors = {};
    if (!form.logoUrl) nextErrors.logoUrl = "El logo es obligatorio.";
    if (!form.name.trim()) nextErrors.name = "Ingresá el nombre del negocio.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Ingresá un email válido.";
    if (!form.placeId) nextErrors.placeId = "Seleccioná una localidad.";
    if (!form.taxonomyId) nextErrors.taxonomyId = "Seleccioná el último nivel de un rubro.";
    if (mode === "deferred" && (!form.planId || !selectedPayment)) nextErrors.payment = "Seleccioná un plan y una modalidad de pago.";
    if (Object.keys(nextErrors).length) { setFieldErrors(nextErrors); return; }
    setFieldErrors({});
    setBusy(true);
    try {
      const submissionMode = Number(selectedPlan?.is_free) === 0 ? "deferred" : mode;
      const response = await fetch("/api/directory/public/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, mode: submissionMode }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setFieldErrors(payload.fieldErrors || {}); throw new Error(payload.error || "No se pudo completar la inscripción."); }
      if (payload.checkoutUrl) { window.location.assign(payload.checkoutUrl); return; }
      setResult(payload);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const fieldClass = key => fieldErrors[key] ? "directory_signup_invalid" : "";
  const fieldMessage = key => fieldErrors[key] && <small className="directory_signup_field_error">{fieldErrors[key]}</small>;

  if (result) return <div className="directory_signup_page"><section className="directory_signup_result"><FaCheck /><h1>{result.pendingPayment ? "Inscripción recibida" : "¡Tu negocio ya está publicado!"}</h1><p>{result.pendingPayment ? "Tu ficha y tu Web ya están activas durante 72 horas mientras aguardamos el pago." : "Tu ficha gratuita ya está publicada en el Directorio."}</p>{result.pendingPayment && (result.accessPath || result.accessLink) ? <a href={result.accessPath || result.accessLink}>Ingresar directamente a mi panel</a> : <p>La modalidad gratuita no incluye acceso al Panel de Control. Podés contratar un plan pago cuando quieras.</p>}</section>{platformWhatsapp && <a className="directory_signup_whatsapp_float" href={`https://wa.me/${platformWhatsapp}?text=${encodeURIComponent("Hola! Quiero Publicar Mi Negocio")}`} target="_blank" rel="noreferrer" aria-label="Consultar por WhatsApp"><FaWhatsapp /><small>¿Podemos ayudarte?</small></a>}</div>;

  return <div className="directory_signup_page">
    <header className="directory_signup_header"><a href="/directorio"><FaArrowLeft /> Volver al Directorio</a><h1>Publicá tu negocio</h1><p>Hacé que tus clientes te encuentren, conozcan tus servicios y contacten con vos.</p></header>
    <section className="directory_signup_content">
      <div className="directory_signup_modes"><button className={mode === "free" ? "active" : ""} type="button" onClick={() => setMode("free")}><strong>Modalidad gratuita</strong><span>Tarjeta en resultados con logo, nombre, contacto y ubicación si la informás.</span></button><button className={mode === "deferred" ? "active" : ""} type="button" onClick={() => setMode("deferred")}><strong>Modalidad paga</strong><span>Ficha web profesional y herramientas para hacer crecer tu negocio.</span></button></div>
      {mode === "free" && <div className="directory_signup_free_info"><strong>¿Qué verá el público?</strong><p>Una tarjeta con tu logo, nombre y datos de contacto. Si cargás coordenadas, también mostraremos tu ubicación en el mapa.</p></div>}
      {mode === "deferred" && <div className="directory_signup_plan_features"><h2>Elegí las herramientas para tu negocio</h2><div className="directory_signup_plan_cards">{plans.map(plan => <article className={String(form.planId) === String(plan.id) ? "selected" : ""} key={plan.id} onClick={() => update("planId", String(plan.id))}><div className="directory_signup_plan_card_head"><div><h3>{plan.name}</h3><p>{plan.code === "directory_web_plus" ? "Más reputación y confianza para convertir visitas en clientes." : "Tu ficha web profesional dentro del Directorio."}</p></div><strong>{plan.currency} {Number(plan.price || 0).toLocaleString("es-AR")} / mes</strong></div><ul>{(FEATURES[plan.code] || []).map(feature => <li key={feature}>✓ {feature}</li>)}</ul><button type="button">{String(form.planId) === String(plan.id) ? "Plan seleccionado" : "Elegir este plan"}</button></article>)}</div>
        <div className="directory_signup_payment_choice"><h3>Elegí cómo y por cuánto tiempo contratar</h3><div className="directory_signup_payment_controls"><label>Forma de pago<select value={form.paymentMethod} onChange={event => { const option = event.target.value === "mercadopago" ? automaticPaymentOption : manualPaymentOptions.find(item => Number(item.months) === Number(form.durationMonths)) || manualPaymentOptions[0]; if (option) choosePayment(option); }}><option value="manual">Pago manual</option>{automaticPaymentOption && <option value="mercadopago">Mercado Pago automático</option>}</select></label>{form.paymentMethod === "manual" && <label>Cantidad de meses<select value={form.durationMonths} onChange={event => { const option = manualPaymentOptions.find(item => Number(item.months) === Number(event.target.value)); if (option) choosePayment(option); }}>{manualPaymentOptions.map(option => <option key={option.code} value={option.months}>{option.months} {Number(option.months) === 1 ? "mes" : "meses"}</option>)}</select></label>}</div>{selectedPayment && <div className={`directory_signup_payment_summary ${Number(selectedPayment.months) === 12 ? "is_annual" : ""}`}><span>{selectedPayment.label}</span><strong>{selectedPayment.currency || selectedPlan.currency} {Number(selectedPayment.amount).toLocaleString("es-AR")}{selectedPayment.method === "mercadopago" ? " por mes" : " total"}</strong></div>}<p className="directory_signup_payment_note">Los períodos manuales menores a un año suman el valor de cada mes calendario incluido. La opción de 12 meses utiliza la Promo anual. Mercado Pago queda como suscripción mensual automática.</p></div>
      </div>}
      <form onSubmit={submit} className="directory_signup_form"><div className="directory_signup_form_intro"><h2>Completá los datos de tu negocio</h2><p>El logo es obligatorio porque la ficha se publica inmediatamente en los resultados.</p></div>
        <div className={`directory_signup_logo_field ${fieldClass("logoUrl")}`}><strong>Logo del negocio <span>(obligatorio)</span></strong><p>JPG, PNG, WebP o AVIF. Máximo 5 MB.</p>{form.logoUrl && <img src={form.logoUrl} alt="Vista previa del logo" />}<label>{logoBusy ? "Subiendo logo..." : form.logoUrl ? "Cambiar logo" : "Cargar logo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={uploadLogo} disabled={logoBusy} /></label>{fieldMessage("logoUrl")}</div>
        {mode === "deferred" && <div className={`directory_signup_payment_notice ${fieldClass("payment")}`}><strong>Importante: tenés 72 horas desde el alta para concretar el pago.</strong><p>Tu ficha queda activa durante ese plazo. Si elegís pago manual, contactanos y utilizá estos datos:</p>{data?.manualPayment?.holder && <span>Titular: {data.manualPayment.holder}</span>}{data?.manualPayment?.alias && <span>Alias: {data.manualPayment.alias}</span>}{data?.manualPayment?.cbu && <span>CBU/CVU: {data.manualPayment.cbu}</span>}{data?.manualPayment?.account && <span>Cuenta: {data.manualPayment.account}</span>}{!data?.manualPayment?.holder && !data?.manualPayment?.alias && !data?.manualPayment?.cbu && !data?.manualPayment?.account && <span>Los datos de pago serán informados por la plataforma al coordinar la suscripción.</span>}{fieldMessage("payment")}</div>}
        <label className={fieldClass("name")}>Nombre del negocio<input required value={form.name} onChange={event => update("name", event.target.value)} />{fieldMessage("name")}</label><label className={fieldClass("email")}>Email de contacto<input required type="email" value={form.email} onChange={event => update("email", event.target.value)} />{fieldMessage("email")}</label><div className="directory_signup_two"><label>Teléfono<input value={form.phone} onChange={event => update("phone", event.target.value)} placeholder="3546778899" /></label><label>WhatsApp<input value={form.whatsapp} onChange={event => update("whatsapp", event.target.value)} placeholder="3546778899" /></label></div>
        <label>Descripción breve<textarea value={form.description} onChange={event => update("description", event.target.value)} maxLength={500} /></label><label>Domicilio<input value={form.address} onChange={event => update("address", event.target.value)} /></label><div className="directory_signup_two"><label>Latitud<input type="number" step="any" value={form.latitude} onChange={event => update("latitude", event.target.value)} placeholder="Opcional" /></label><label>Longitud<input type="number" step="any" value={form.longitude} onChange={event => update("longitude", event.target.value)} placeholder="Opcional" /></label></div>
        <label className={fieldClass("placeId")}>Localidad<select required value={form.placeId} onChange={event => update("placeId", event.target.value)}><option value="">Seleccioná una localidad</option>{places.map(place => <option key={place.id} value={place.id}>{pathLabel(place, data.places)}</option>)}</select>{fieldMessage("placeId")}</label><label className={fieldClass("taxonomyId")}>Rubro<select required value={form.taxonomyId} onChange={event => update("taxonomyId", event.target.value)}><option value="">Seleccioná tu actividad</option>{taxonomy.map(item => <option key={item.id} value={item.id}>{pathLabel(item, data.taxonomy)}</option>)}</select>{fieldMessage("taxonomyId")}</label>
        <div className="directory_signup_help_row"><p className="directory_signup_help">¿No encontrás el rubro exacto? Contactanos e indicá tu actividad para asignar o crear el rubro adecuado.</p></div>
        {error && <div className="directory_signup_error">{error}</div>}<button className="directory_signup_submit" disabled={busy || logoBusy}>{busy ? "Procesando..." : mode === "deferred" ? "Continuar con la inscripción paga" : "Publicar mi negocio gratis"}</button>
      </form>
    </section>
    {platformWhatsapp && <a className="directory_signup_whatsapp_float" href={`https://wa.me/${platformWhatsapp}?text=${encodeURIComponent("Hola! Quiero Publicar Mi Negocio")}`} target="_blank" rel="noreferrer" aria-label="Consultar por WhatsApp"><FaWhatsapp /><small>¿Podemos ayudarte?</small></a>}
  </div>;
}
