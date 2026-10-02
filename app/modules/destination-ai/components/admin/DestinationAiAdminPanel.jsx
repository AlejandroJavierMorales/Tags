"use client";

import { useEffect, useState } from "react";
import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";
import DestinationAiKnowledgePanel from "./DestinationAiKnowledgePanel";
import DestinationAiQuestionsPanel from "./DestinationAiQuestionsPanel";
import "./DestinationAiAdminPanel.css";
import "./DestinationAiLimits.css";

const currentPeriod = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; };
const money = value => `USD ${Number(value || 0).toFixed(6)}`;

export default function DestinationAiAdminPanel() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [siteId, setSiteId] = useState("");
  const [period, setPeriod] = useState(currentPeriod);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState("settings");

  async function load(nextSiteId = siteId, nextPeriod = period) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period: nextPeriod });
      if (nextSiteId) params.set("siteId", nextSiteId);
      const response = await fetch(`/api/directory/admin/destination-ai?${params}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "No se pudo cargar Muchi");
      setData(payload);
      setForm(payload.settings);
      setSiteId(String(payload.site.id));
    } catch (error) { await showAlert({ title: "No se pudo cargar", text: error.message, icon: "error" }); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  async function save(event) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch("/api/directory/admin/destination-ai", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, siteId }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "No se pudo guardar");
      setForm(payload.settings);
      await load(siteId, period);
      await showAlert({ title: "Configuración guardada", text: "El asistente del Directorio quedó actualizado.", icon: "success", timer: 1500 });
    } catch (error) { await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" }); }
    finally { setSaving(false); }
  }
  if (loading && !data) return <section className="tags_destination_admin_loading"><TagsSpinner /></section>;
  if (!form) return null;
  const summary = data?.usage?.summary || {};
  const limitState = data?.usage?.limitState || {};
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  return <section className="tags_destination_admin">
    {loading && <div className="tags_destination_admin_busy"><TagsSpinner /></div>}
    <header><div><h2>Asistente del destino</h2><p>Configuración visual, conversación y consumo por Directorio.</p></div><div><label>Directorio<select value={siteId} onChange={event => { const value=event.target.value; setSiteId(value); load(value,period); }}>{data?.sites?.map(site => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label><label>Período<input type="month" value={period} onChange={event => { setPeriod(event.target.value); load(siteId,event.target.value); }} /></label></div></header>
    <nav className="tags_destination_admin_tabs"><button type="button" className={section==="settings"?"active":""} onClick={()=>setSection("settings")}>Configuración y consumo</button><button type="button" className={section==="questions"?"active":""} onClick={()=>setSection("questions")}>Consultas</button><button type="button" className={section==="knowledge"?"active":""} onClick={()=>setSection("knowledge")}>Base de conocimiento</button></nav>
    {section==="settings"&&<>
    <div className="tags_destination_usage">
      <article><span>Consultas y procesos</span><strong>{Number(summary.requests || 0).toLocaleString("es-AR")}</strong></article>
      <article><span>Tokens de IA</span><strong>{Number(summary.total_tokens || 0).toLocaleString("es-AR")}</strong><small>Entrada {Number(summary.input_tokens || 0).toLocaleString("es-AR")} · salida {Number(summary.output_tokens || 0).toLocaleString("es-AR")}</small></article>
      <article><span>Costo técnico estimado</span><strong>{money(summary.estimated_cost_usd)}</strong></article>
    </div>
    {limitState.blocked ? <div className="tags_destination_limit_notice is_blocked"><strong>Límite mensual alcanzado.</strong> Muchi no aceptará nuevas consultas hasta ampliar el margen, desactivar el límite o comenzar un nuevo período.</div> : limitState.nearLimit ? <div className="tags_destination_limit_notice"><strong>Muchi está cerca del límite.</strong> La interacción pasó automáticamente a texto para reducir el consumo.</div> : null}
    <form onSubmit={save}>
      <section><h3>Publicación</h3><label className="check"><input type="checkbox" checked={Boolean(form.enabled)} onChange={event => update("enabled",event.target.checked)} /><span><strong>Mostrar asistente</strong><small>Habilita el personaje, el chat y el acceso desde el menú.</small></span></label></section>
      <section><h3>Tipo de interacción</h3><div className="tags_destination_modes_admin">
        <label data-active={form.interactionMode === "text_text"}><input type="radio" name="interaction" checked={form.interactionMode === "text_text"} onChange={() => update("interactionMode","text_text")} /><strong>Texto → texto</strong><small>El usuario escribe y el asistente responde por escrito.</small></label>
        <label data-active={form.interactionMode === "voice_text"}><input type="radio" name="interaction" checked={form.interactionMode === "voice_text"} onChange={() => update("interactionMode","voice_text")} /><strong>Texto/audio → texto</strong><small>El usuario escribe o habla; el asistente responde por escrito. Predeterminado.</small></label>
        <label data-active={form.interactionMode === "voice_voice"}><input type="radio" name="interaction" checked={form.interactionMode === "voice_voice"} onChange={() => update("interactionMode","voice_voice")} /><strong>Audio ↔ audio</strong><small>Permite conversar por voz y conserva el texto como respaldo.</small></label>
      </div></section>
      <section><h3>Límite de consumo</h3><label className="check"><input type="checkbox" checked={Boolean(form.limitEnabled)} onChange={event => update("limitEnabled",event.target.checked)} /><span><strong>Aplicar límite mensual</strong><small>Permite controlar el gasto estimado de Muchi en este Directorio.</small></span></label><div className="tags_destination_limit_fields"><label>Límite mensual (USD)<input type="number" min="0" step="0.01" value={form.monthlyUsdLimit} disabled={!form.limitEnabled} onChange={event => update("monthlyUsdLimit",event.target.value)} /></label><label>Umbral de aviso (%)<input type="number" min="1" max="100" step="1" value={form.warningPercent} disabled={!form.limitEnabled} onChange={event => update("warningPercent",event.target.value)} /></label><label>Extensión extraordinaria (USD)<input type="number" min="0" step="0.01" value={form.extraUsdAllowance} disabled={!form.limitEnabled} onChange={event => update("extraUsdAllowance",event.target.value)} /></label></div><div className="tags_destination_limit_resume"><span>Consumido <strong>{money(limitState.usageUsd)}</strong></span><span>Aviso en <strong>{money(limitState.warningAtUsd)}</strong></span><span>Tope efectivo <strong>{money(limitState.effectiveLimitUsd)}</strong></span></div><p className="tags_destination_limit_help">Al alcanzar el umbral se desactiva automáticamente el audio, se muestra un aviso y se envía una alerta. Al alcanzar el tope efectivo se frenan nuevas consultas. La extensión amplía el tope sin modificar el presupuesto base.</p></section>
      <section><h3>Textos</h3><div className="tags_destination_form_grid"><label>Título del chat<input value={form.title} onChange={event => update("title",event.target.value)} maxLength="100" /></label><label>Subtítulo<input value={form.subtitle} onChange={event => update("subtitle",event.target.value)} maxLength="160" /></label><label className="wide">Saludo inicial<textarea value={form.greeting} onChange={event => update("greeting",event.target.value)} maxLength="500" /></label><label>Texto sobre el personaje<input value={form.characterTitle} onChange={event => update("characterTitle",event.target.value)} maxLength="80" /></label><label>Botón del personaje<input value={form.characterButtonLabel} onChange={event => update("characterButtonLabel",event.target.value)} maxLength="40" /></label><label>Nombre en el menú<input value={form.menuLabel} onChange={event => update("menuLabel",event.target.value)} maxLength="40" /></label></div></section>
      <section><h3>Apariencia y ubicación</h3><div className="tags_destination_form_grid"><label>Color principal<input type="color" value={form.primaryColor} onChange={event => update("primaryColor",event.target.value)} /></label><label>Color del acceso<input type="color" value={form.launcherColor} onChange={event => update("launcherColor",event.target.value)} /></label><label>Ubicación<select value={form.position} onChange={event => update("position",event.target.value)}><option value="right">Abajo a la derecha</option><option value="left">Abajo a la izquierda</option></select></label><label>Separación inferior (px)<input type="number" min="0" max="400" value={form.launcherOffsetBottom} onChange={event => update("launcherOffsetBottom",event.target.value)} /></label></div></section>
      <footer><button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar configuración"}</button></footer>
    </form>
    <section className="tags_destination_usage_detail"><h3>Detalle del período</h3>{data?.usage?.breakdown?.length ? <table><thead><tr><th>Proceso</th><th>Solicitudes</th><th>Tokens</th><th>USD</th></tr></thead><tbody>{data.usage.breakdown.map(item => <tr key={item.source}><td>{item.source.includes("-audio:") ? "Transcripción" : item.source.includes("-tts:") ? "Respuesta hablada" : "Conversación"}</td><td>{item.requests}</td><td>{Number(item.total_tokens || 0).toLocaleString("es-AR")}</td><td>{money(item.estimated_cost_usd)}</td></tr>)}</tbody></table> : <p>Todavía no hay consumo registrado en este período.</p>}</section>
    </>}
    {section==="questions"&&<DestinationAiQuestionsPanel siteId={siteId} period={period}/>} 
    {section==="knowledge"&&<DestinationAiKnowledgePanel siteId={siteId} />}
  </section>;
}
