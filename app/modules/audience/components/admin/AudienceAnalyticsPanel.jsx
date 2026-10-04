"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import showAlert from "@/app/components/showAlert";
import "./AudienceAnalyticsPanel.css";

const ACTION_LABELS = {
  whatsapp: "WhatsApp",
  phone: "Llamadas",
  email: "Emails",
  directions: "Cómo llegar",
  navigation: "Navegación",
  interaction: "Otras acciones",
};

function number(value) {
  return Number(value || 0).toLocaleString("es-AR");
}

function AudienceTable({ title, headers, rows, empty = "Todavía no hay datos para este período." }) {
  return <section className="tags_audience_panel_card">
    <h2>{title}</h2>
    <div className="tags_audience_table_wrap">
      <table><thead><tr>{headers.map(item => <th key={item.key}>{item.label}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.key || index}>{headers.map(item => <td key={item.key}>{item.render ? item.render(row) : row[item.key]}</td>)}</tr>)}</tbody>
      </table>
      {!rows.length && <p className="tags_audience_empty">{empty}</p>}
    </div>
  </section>;
}

export default function AudienceAnalyticsPanel() {
  const [days, setDays] = useState("30");
  const [businessId, setBusinessId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [businessSearch, setBusinessSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("");
  const [whatsappRecipient, setWhatsappRecipient] = useState("");
  const [sending, setSending] = useState("");
  const [deliveries, setDeliveries] = useState([]);
  const [searchConsole, setSearchConsole] = useState(null);
  const [googleData, setGoogleData] = useState(null);
  const [googleError, setGoogleError] = useState("");

  async function loadDeliveries() {
    const response = await fetch("/api/admin/audience/delivery", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.ok) setDeliveries(payload.deliveries || []);
  }

  useEffect(() => { loadDeliveries().catch(() => {}); }, []);

  async function loadSearchConsoleConnection() {
    const response = await fetch("/api/admin/audience/search-console/connection", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.ok) setSearchConsole(payload);
    else setGoogleError(payload.error || "No se pudo cargar Search Console");
  }

  useEffect(() => { loadSearchConsoleConnection().catch(() => setGoogleError("No se pudo cargar Search Console")); }, []);

  useEffect(() => {
    if (searchConsole?.connection?.status !== "connected" || (!businessId && !searchConsole.connection.selectedSiteUrl)) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ days });
    if (businessId) params.set("businessId", businessId);
    setGoogleError("");
    setGoogleData(null);
    fetch(`/api/admin/audience/search-console/data?${params}`, { cache: "no-store", signal: controller.signal })
      .then(response => response.json().then(body => ({ response, body })))
      .then(({ response, body }) => { if (!response.ok || !body.ok) throw new Error(body.error || "No se pudieron cargar los datos de Google"); setGoogleData(body); })
      .catch(err => { if (err.name !== "AbortError") setGoogleError(err.message); });
    return () => controller.abort();
  }, [businessId, days, searchConsole]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ days });
    if (businessId) params.set("businessId", businessId);
    if (siteId) params.set("siteId", siteId);
    setLoading(true);
    setError("");
    fetch(`/api/admin/audience/overview?${params}`, { cache: "no-store", signal: controller.signal })
      .then(response => response.json().then(body => ({ response, body })))
      .then(({ response, body }) => {
        if (!response.ok || !body.ok) throw new Error(body.error || "No se pudieron cargar las métricas");
        setData(body);
      })
      .catch(err => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [businessId, days, siteId]);

  const matchingBusinesses = useMemo(() => {
    const term = businessSearch.trim().toLowerCase();
    if (!term) return [];
    return (data?.businesses || []).filter(item => [item.name, item.email, item.id].some(value => String(value || "").toLowerCase().includes(term))).slice(0, 12);
  }, [businessSearch, data]);

  const reportQuery = new URLSearchParams({ days });
  if (businessId) reportQuery.set("businessId", businessId);
  if (siteId) reportQuery.set("siteId", siteId);

  async function sendReport(channel) {
    setSending(channel);
    try {
      const recipient = channel === "email" ? emailRecipient || data?.selectedBusiness?.email || "" : whatsappRecipient;
      const response = await fetch("/api/admin/audience/delivery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days, businessId: businessId || null, siteId: siteId || null, channel, recipient }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "No se pudo preparar el reporte");
      await loadDeliveries();
      if (payload.whatsappUrl) window.location.href = payload.whatsappUrl;
      else await showAlert({ title: "Reporte enviado", text: "El informe se envió correctamente por email.", icon: "success" });
    } catch (err) {
      await showAlert({ title: "No se pudo enviar", text: err.message, icon: "error" });
    } finally { setSending(""); }
  }

  async function selectGoogleProperty(siteUrl) {
    const response = await fetch("/api/admin/audience/search-console/connection", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteUrl }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) return showAlert({ title: "No se pudo seleccionar", text: payload.error || "Propiedad inválida", icon: "error" });
    await loadSearchConsoleConnection();
  }

  return <div className="tags_audience_admin">
    <section className="tags_audience_filters">
      <label>Período<select value={days} onChange={event => setDays(event.target.value)}><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="365">Último año</option></select></label>
      <label>Directorio<select value={siteId} onChange={event => setSiteId(event.target.value)}><option value="">Todos los directorios</option>{(data?.sites || []).map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
      <div className="tags_audience_business_picker">
        <label>Cliente<input value={businessSearch} onChange={event => { setBusinessSearch(event.target.value); if (!event.target.value) setBusinessId(""); }} placeholder="Buscar por nombre, email o ID" /></label>
        {matchingBusinesses.length > 0 && <div className="tags_audience_business_results">{matchingBusinesses.map(item => <button type="button" key={item.id} onClick={() => { setBusinessId(String(item.id)); setBusinessSearch(`${item.name} · ${item.email || "sin email"}`); }}><strong>{item.name}</strong><span>{item.email || "Sin email"}</span><small>{item.directories || "Sin directorio"}</small></button>)}</div>}
      </div>
      <Link className="tags_audience_report_button" href={`/api/admin/audience/report?${reportQuery}`} target="_blank">Imprimir / guardar reporte</Link>
    </section>

    {error && <div className="tags_audience_error">{error}</div>}
    {loading && <div className="tags_audience_loading">Cargando métricas…</div>}
    {!loading && data && <>
      <div className="tags_audience_scope"><strong>{data.selectedBusiness?.name || "Toda la plataforma"}</strong><span>{data.selectedBusiness?.email || `${days} días seleccionados`}</span></div>
      <section className="tags_audience_kpis tags_audience_kpis_extended">
        <article><span>Páginas vistas</span><strong>{number(data.summary?.page_views)}</strong></article>
        <article><span>Visitantes únicos</span><strong>{number(data.summary?.unique_visitors)}</strong></article>
        <article><span>Sesiones</span><strong>{number(data.summary?.sessions)}</strong></article>
        <article><span>Clics y acciones</span><strong>{number(data.summary?.action_clicks)}</strong></article>
        <article><span>Búsquedas y preguntas</span><strong>{number(Number(data.summary?.searches || 0) + Number(data.summary?.ai_questions || 0))}</strong></article>
        <article><span>Apariciones en resultados</span><strong>{number(data.summary?.result_impressions)}</strong></article>
        <article><span>Clics desde resultados</span><strong>{number(data.summary?.result_clicks)}</strong></article>
      </section>
      <div className="tags_audience_grid">
        <AudienceTable title="Páginas más visitadas" headers={[
          { key: "page", label: "Página", render: item => <><strong>{item.business_name || item.public_host}</strong><small>{item.public_host}{item.path}</small></> },
          { key: "page_views", label: "Vistas", render: item => number(item.page_views) },
          { key: "visitors", label: "Personas", render: item => number(item.visitors) },
          { key: "clicks", label: "Clics", render: item => number(item.clicks) },
        ]} rows={data.pages || []} />
        <AudienceTable title="Acciones realizadas" headers={[
          { key: "action_key", label: "Acción", render: item => ACTION_LABELS[item.action_key] || item.example_label || item.action_key },
          { key: "total", label: "Cantidad", render: item => number(item.total) },
        ]} rows={data.actions || []} />
        <AudienceTable title="Frases buscadas" headers={[
          { key: "search_query", label: "Búsqueda" },
          { key: "total", label: "Veces", render: item => number(item.total) },
          { key: "sessions", label: "Sesiones", render: item => number(item.sessions) },
        ]} rows={data.searches || []} />
        <AudienceTable title="Preguntas realizadas a Muchi" headers={[
          { key: "question_group", label: "Tema", render: item => <><strong>{item.question_group}</strong><small>{item.example_question}</small></> },
          { key: "total", label: "Veces", render: item => number(item.total) },
          { key: "no_results", label: "Sin respuesta", render: item => number(item.no_results) },
        ]} rows={data.aiQuestions || []} />
        <AudienceTable title="Origen de las visitas" headers={[
          { key: "source", label: "Origen" },
          { key: "page_views", label: "Vistas", render: item => number(item.page_views) },
        ]} rows={data.sources || []} />
      </div>
      <section className="tags_audience_delivery">
        <div><span>COMPARTIR INFORME</span><h2>Enviar reporte del período seleccionado</h2><p>Usa el mismo cliente, directorio y período elegidos arriba.</p></div>
        <label>Email<input type="email" value={emailRecipient} onChange={event => setEmailRecipient(event.target.value)} placeholder={data.selectedBusiness?.email || "destinatario@ejemplo.com"} /></label>
        <button type="button" disabled={Boolean(sending)} onClick={() => sendReport("email")}>{sending === "email" ? "Enviando…" : "Enviar por email"}</button>
        <label>WhatsApp<input value={whatsappRecipient} onChange={event => setWhatsappRecipient(event.target.value)} placeholder="5493546… (opcional si el cliente lo tiene cargado)" /></label>
        <button type="button" disabled={Boolean(sending)} onClick={() => sendReport("whatsapp")}>{sending === "whatsapp" ? "Preparando…" : "Compartir por WhatsApp"}</button>
      </section>
      {deliveries.length > 0 && <details className="tags_audience_delivery_history"><summary>Historial de reportes enviados ({deliveries.length})</summary><div>{deliveries.slice(0, 30).map(item => <article key={item.id}><strong>{item.business_name || "Reporte general"}</strong><span>{item.channel === "email" ? "Email" : "WhatsApp"} · {item.recipient}</span><small>{new Date(item.created_at).toLocaleString("es-AR")} · {item.status === "sent" ? "Enviado" : item.status === "error" ? "Error" : "Preparado"}</small></article>)}</div></details>}
      <section className="tags_audience_google">
        <header><div><span>GOOGLE SEARCH CONSOLE</span><h2>Rendimiento en búsquedas de Google</h2><p>Impresiones, clics, CTR, posición y consultas orgánicas. Estos datos son distintos de la navegación interna.</p></div>{searchConsole?.connection?.status === "connected" ? businessId ? <strong className="tags_audience_google_auto">Selección automática del cliente</strong> : <select value={searchConsole.connection.selectedSiteUrl || ""} onChange={event => selectGoogleProperty(event.target.value)}><option value="">Seleccionar propiedad</option>{searchConsole.connection.sites.map(site => <option key={site.siteUrl} value={site.siteUrl}>{site.siteUrl}</option>)}</select> : searchConsole?.configured ? <a href="/api/admin/audience/search-console/connect">Conectar Search Console</a> : <span>Configuración pendiente</span>}</header>
        <p className="tags_audience_google_privacy">Search Console se consulta en modo de sólo lectura. Podés revocar el acceso cuando quieras. <a href="/politica-de-privacidad" target="_blank" rel="noreferrer">Política de Privacidad</a> · <a href="/gestion-de-datos" target="_blank" rel="noreferrer">Gestión de datos</a></p>
        {!searchConsole?.configured && <p className="tags_audience_google_notice">Falta configurar la URL de retorno de Search Console en el servidor.</p>}
        {googleError && <p className="tags_audience_google_error">{googleError}</p>}
        {googleData && <><p className="tags_audience_google_properties"><strong>Datos incluidos:</strong> {(googleData.propertiesUsed || []).map(item => item.label || item.siteUrl).join(" · ")}</p><div className="tags_audience_google_kpis"><article><span>Impresiones en Google</span><strong>{number(googleData.summary.impressions)}</strong></article><article><span>Clics orgánicos</span><strong>{number(googleData.summary.clicks)}</strong></article><article><span>CTR</span><strong>{(Number(googleData.summary.ctr || 0) * 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%</strong></article><article><span>Posición promedio</span><strong>{Number(googleData.summary.position || 0).toLocaleString("es-AR", { maximumFractionDigits: 1 })}</strong></article></div><div className="tags_audience_grid"><AudienceTable title="Consultas en Google" headers={[{key:"query",label:"Consulta",render:item=>item.keys?.[0]||"-"},{key:"impressions",label:"Impresiones",render:item=>number(item.impressions)},{key:"clicks",label:"Clics",render:item=>number(item.clicks)},{key:"position",label:"Posición",render:item=>Number(item.position||0).toLocaleString("es-AR",{maximumFractionDigits:1})}]} rows={googleData.queries||[]} /><AudienceTable title="Páginas en Google" headers={[{key:"page",label:"Página",render:item=><small>{item.keys?.[0]||"-"}</small>},{key:"impressions",label:"Impresiones",render:item=>number(item.impressions)},{key:"clicks",label:"Clics",render:item=>number(item.clicks)}]} rows={googleData.pages||[]} /></div></>}
      </section>
    </>}
  </div>;
}
