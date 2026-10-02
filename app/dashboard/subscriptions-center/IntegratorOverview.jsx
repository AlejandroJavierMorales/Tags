"use client";

import { useEffect, useMemo, useState } from "react";
import showAlert from "@/app/components/showAlert";
import WorkspaceAppCreateModal from "@/app/components/businesses/WorkspaceAppCreateModal";
import "./integratorOverview.css";

const CURRENT_STATUSES = new Set(["active", "trial", "past_due", "paused"]);
const USAGE_KEYS = {
  qr_page: ["qr_pages_used", "qr_pages_total"], tagsid: ["tags_id_used", "tags_id_total"],
  client_reviews: ["reviews_used", "reviews_total"], store: ["store_used", "store_total"],
  resto: ["resto_used", "resto_total"], portal_public: ["portal_public_used", "portal_public_total"],
  turnos: ["turnos_used", "turnos_total"], booking: ["booking_used", "booking_total"]
};
const statusLabel = value => ({ active: "Vigente", trial: "Prueba", past_due: "Con deuda", paused: "Pausada" }[value] || value || "Sin suscripción");
const expiryLabel = value => value ? `Vence el ${new Date(value).toLocaleDateString("es-AR")}` : "Sin vencimiento";
const SETUP = {
  store: { title: "Preparar tienda", description: "Definí el nombre y la dirección pública de la tienda. Al crearla aparecerá automáticamente en el builder de la Web.", endpoint: "/api/workspace/apps/store/activate", button: "Crear tienda", success: "Tienda preparada", slugSuffix: "tienda" },
  resto: { title: "Preparar gastronomía", description: "Definí el nombre y la dirección pública del espacio gastronómico. Al crearlo aparecerá automáticamente en el builder de la Web.", endpoint: "/api/workspace/apps/resto/activate", button: "Crear gastronomía", success: "Gastronomía preparada", slugSuffix: "gastronomia" },
  turnos: { title: "Preparar reservas", description: "Definí el nombre, la dirección pública y el tipo de actividad. Al crearla aparecerá automáticamente en el builder de la Web.", endpoint: "/api/workspace/apps/turnos/activate", button: "Crear reservas", success: "Reservas preparadas", slugSuffix: "reservas", profiles: [{ value: "generic", label: "Servicios generales" }, { value: "spa", label: "Spa" }, { value: "bike_kayak", label: "Bicicletas / Kayaks" }, { value: "sports_club", label: "Club deportivo" }, { value: "hairdresser", label: "Peluquería" }] }
};

export default function IntegratorOverview({ businessId, businesses, subscriptions, planAddons, subscriptionGrants = [], addons, directorySites, onChanged }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [impact, setImpact] = useState(null);
  const [impactLoading, setImpactLoading] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [setupAddon, setSetupAddon] = useState("");
  const business = businesses.find(item => Number(item.id) === Number(businessId));
  const subscription = subscriptions.find(item => Number(item.business_id) === Number(businessId) && CURRENT_STATUSES.has(item.effective_status));
  const site = directorySites.find(item => Number(item.id) === Number(business?.directory_site_id));
  const addonNames = useMemo(() => Object.fromEntries(addons.map(item => [item.code, item.name])), [addons]);
  const savedComposition = subscriptionGrants.filter(item => Number(item.subscription_id) === Number(subscription?.id) && item.status !== "removed");
  const removedComposition = subscriptionGrants.filter(item => Number(item.subscription_id) === Number(subscription?.id) && item.status === "removed");
  const included = savedComposition.length ? savedComposition : planAddons.filter(item => Number(item.plan_id) === Number(subscription?.plan_id));
  const contractedComposition = (() => {
    const items = new Map(included.map(item => [item.addon_code, { ...item }]));
    if (savedComposition.length || !summary?.addons?.length) return [...items.values()];
    const active = new Map();
    for (const item of summary.addons) {
      const current = active.get(item.addon_code) || { ...item, quantity: 0 };
      current.quantity += Number(item.quantity || 1);
      active.set(item.addon_code, current);
    }
    for (const [code, item] of active) items.set(code, item);
    return [...items.values()];
  })();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setSummary(null);
    fetch(`/api/business/subscription-summary?id=${encodeURIComponent(businessId)}`, { cache: "no-store", signal: controller.signal })
      .then(async response => ({ response, payload: await response.json().catch(() => ({})) }))
      .then(({ response, payload }) => { if (!response.ok) throw new Error(payload.error || "No se pudo cargar el estado operativo"); setSummary(payload); })
      .catch(requestError => { if (requestError.name !== "AbortError") setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [businessId, refresh]);

  async function inspectRemoval(addonCode) {
    setImpactLoading(addonCode); setImpact(null);
    try {
      const response = await fetch(`/api/subscriptions/admin/addon-impact?businessId=${encodeURIComponent(businessId)}&addonCode=${encodeURIComponent(addonCode)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo revisar esta funcionalidad");
      setImpact(payload.impact);
    } catch (requestError) {
      setImpact({ addonCode, addonName: addonNames[addonCode] || addonCode, error: requestError.message, items: [] });
    } finally { setImpactLoading(""); }
  }

  async function deactivateAndKeep() {
    if (!impact?.addonCode || !subscription?.id) return;
    const details = impact.items.filter(item => item.count > 0).map(item => `${item.count} ${item.label}`).join(", ");
    const confirmed = await showAlert({ title: `Quitar ${impact.addonName}`, text: `${details ? `Este cliente tiene ${details}. ` : ""}Dejará de usar esta funcionalidad, pero guardaremos toda su información.`, icon: "warning", showCancelButton: true, confirmButtonText: "Quitar y guardar", cancelButtonText: "Cancelar" });
    if (!confirmed) return;
    setImpactLoading(impact.addonCode);
    try {
      const response = await fetch("/api/subscriptions/admin/addon-impact", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deactivate_keep_data", businessId, subscriptionId: subscription.id, addonCode: impact.addonCode }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return showAlert({ title: "No se pudo quitar", text: payload.error, icon: "error" });
      setImpact(null); setRefresh(value => value + 1); await onChanged?.();
      await showAlert({ title: "Funcionalidad quitada", text: "El cliente dejó de tener acceso y su información quedó guardada.", icon: "success" });
    } finally { setImpactLoading(""); }
  }

  async function restoreAddon(item) {
    const confirmed = await showAlert({ title: `Volver a habilitar ${item.addon_name || addonNames[item.addon_code] || item.addon_code}`, text: "Se recuperará la configuración guardada. No se crearán páginas ni datos nuevos.", icon: "question", showCancelButton: true, confirmButtonText: "Volver a habilitar", cancelButtonText: "Cancelar" });
    if (!confirmed) return;
    setImpactLoading(item.addon_code);
    try {
      const response = await fetch("/api/subscriptions/admin/addon-impact", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore", businessId, subscriptionId: subscription.id, addonCode: item.addon_code }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return showAlert({ title: "No se pudo habilitar", text: payload.error, icon: "error" });
      setRefresh(value => value + 1); await onChanged?.();
      await showAlert({ title: payload.status === "active" ? "Funcionalidad habilitada" : "Funcionalidad recuperada", text: payload.message, icon: "success" });
    } finally { setImpactLoading(""); }
  }

  return <div className="tags_integrator_overview">
    <section className="tags_integrator_summary">
      <article><span>Cliente</span><strong>{business?.name || business?.display_name}</strong><small>{business?.email}</small></article>
      <article><span>Suscripción actual</span><strong>{subscription?.plan_name || "Sin suscripción vigente"}</strong><small>{statusLabel(subscription?.effective_status)}{subscription ? ` · ${expiryLabel(subscription.expires_at)}` : ""}</small></article>
      <article><span>Directorio</span><strong>{site?.name || "No asignado"}</strong><small>{site?.primary_host || "Sin presencia en directorio detectada"}</small></article>
    </section><div className="tags_integrator_columns">
      <section><header><h3>Producto contratado</h3><p>Qué incluye y qué falta preparar para entregárselo al cliente.</p></header>{contractedComposition.length ? <div className="tags_integrator_addons">{contractedComposition.map(item => { const keys = USAGE_KEYS[item.addon_code]; const used = keys ? Number(summary?.usage?.[keys[0]] || 0) : null; const total = Number(item.quantity || 1); const canPrepare = Boolean(SETUP[item.addon_code]) && used !== null && used < total; return <article key={item.addon_code}><div><strong>{addonNames[item.addon_code] || item.addon_code.replaceAll("_", " ")}</strong><small>{used === null ? `${total} contratada${total === 1 ? "" : "s"}` : used >= total ? "Listo para usar" : `${used} de ${total} preparadas`}</small></div>{canPrepare ? <button className="tags_integrator_prepare" type="button" onClick={() => setSetupAddon(item.addon_code)}>Preparar ahora</button> : <b>{used !== null && used >= total ? "Listo" : `${total} contratada${total === 1 ? "" : "s"}`}</b>}</article>; })}</div> : <p className="tags_integrator_note">El plan no tiene herramientas declaradas en su versión actual.</p>}</section>
      <section><header><h3>Funcionamiento real</h3><p>Derechos activos e instancias creadas actualmente.</p></header>{loading && <p className="tags_integrator_note">Consultando estado operativo...</p>}{error && <p className="tags_integrator_error">{error}</p>}{!loading && !error && summary && (summary.addons?.length ? <div className="tags_integrator_addons">{summary.addons.map(item => { const keys = USAGE_KEYS[item.addon_code]; const used = keys ? Number(summary.usage?.[keys[0]] || 0) : null; const total = keys ? Number(summary.usage?.[keys[1]] || item.quantity || 0) : Number(item.quantity || 0); return <article key={`${item.addon_code}-${item.expires_at || "open"}`}><div><strong>{addonNames[item.addon_code] || item.addon_code.replaceAll("_", " ")}</strong><small>Activo{item.expires_at ? ` hasta ${new Date(item.expires_at).toLocaleDateString("es-AR")}` : " sin vencimiento propio"}</small></div><span><b>{used === null ? `${total} habilitada${total === 1 ? "" : "s"}` : `${used}/${total} en uso`}</b><button type="button" disabled={impactLoading === item.addon_code} onClick={() => inspectRemoval(item.addon_code)}>{impactLoading === item.addon_code ? "Revisando..." : "Ver qué pasaría al quitarla"}</button></span></article>; })}</div> : <p className="tags_integrator_note">No hay herramientas operativas activas para este cliente.</p>)}</section>
    </div>
    {removedComposition.length > 0 && <section className="tags_integrator_saved"><header><h3>Funcionalidades guardadas</h3><p>El cliente no tiene acceso, pero su información sigue disponible.</p></header><div>{removedComposition.map(item => <article key={item.addon_code}><span><strong>{item.addon_name || addonNames[item.addon_code] || item.addon_code.replaceAll("_", " ")}</strong><small>{Number(item.quantity || 1)} contratada{Number(item.quantity || 1) === 1 ? "" : "s"}</small></span><button type="button" disabled={impactLoading === item.addon_code} onClick={() => restoreAddon(item)}>{impactLoading === item.addon_code ? "Habilitando..." : "Volver a habilitar"}</button></article>)}</div></section>}
    {impact && <section className="tags_integrator_impact"><header><div><small>ANTES DE QUITAR</small><h3>{impact.addonName}</h3></div><button type="button" onClick={() => setImpact(null)}>Cerrar</button></header>{impact.error ? <p className="tags_integrator_error">{impact.error}</p> : !impact.configured ? <p>Todavía no existe una revisión segura para esta funcionalidad. No podrá quitarse hasta incorporarla.</p> : <><p>Este cliente tiene actualmente:</p><ul>{impact.items.map(item => <li key={item.label}><strong>{item.count}</strong> {item.label}{item.preserve && item.count > 0 ? <small>Se conservará como historial.</small> : null}</li>)}</ul>{!impact.hasData && <p>No encontramos información creada para esta funcionalidad.</p>}<p className="tags_integrator_impact_notice">Al quitarla, el cliente perderá el acceso pero guardaremos esta información.</p><footer><button type="button" disabled={Boolean(impactLoading)} onClick={deactivateAndKeep}>{impactLoading ? "Quitando..." : "Quitar y guardar la información"}</button></footer></>}</section>}
    {setupAddon && <WorkspaceAppCreateModal open businessId={businessId} initialName={business?.name || business?.display_name || ""} initialSlug={`${business?.name || business?.display_name || "negocio"}-${SETUP[setupAddon].slugSuffix}`} title={SETUP[setupAddon].title} description={SETUP[setupAddon].description} endpoint={SETUP[setupAddon].endpoint} allowCustomSlug businessProfileOptions={SETUP[setupAddon].profiles || []} createButtonLabel={SETUP[setupAddon].button} successTitle={SETUP[setupAddon].success} successMessage="La funcionalidad quedó creada y ya puede incorporarse a la Web del cliente." onClose={() => setSetupAddon("")} onCreated={async () => { setSetupAddon(""); setRefresh(value => value + 1); await onChanged?.(); }} />}
  </div>;
}
