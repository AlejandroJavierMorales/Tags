"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AudienceAnalyticsPanel from "@/app/modules/audience/components/admin/AudienceAnalyticsPanel";
import "./page.css";

const PAGE_SIZE = 25;

const APP_BRANDS = {
  calamuchitar: {
    name: "CalamuchitAr",
    logo: "/directory/calamuchitar/footer/logo_calamuchitar_redondo_200x200.png"
  },
  muchi: {
    name: "Muchi",
    logo: "/assets/destination-ai/muchi/icons/muchi-icon-192.png"
  }
};

function branding(appCode, domain) {
  if (APP_BRANDS[appCode]) return APP_BRANDS[appCode];
  const value = String(domain || "").toLowerCase();
  if (value.includes("tags")) return { name: "Tags", logo: "/logo_tags_qr.webp" };
  return { name: domain || "Sin dominio", logo: "/logo_tags_qr.webp" };
}

function numberValue(value) {
  return Number(value || 0);
}

function dateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "medium"
  });
}

function coordinatesLink(item) {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export default function PwaInstallationsClient() {
  const [section, setSection] = useState("audience");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [appFilter, setAppFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/public/pwa-installations?app_code=all", { cache: "no-store" })
      .then(response => response.json().then(body => ({ response, body })))
      .then(({ response, body }) => {
        if (!response.ok || !body.success) throw new Error(body.error || "No se pudieron cargar las instalaciones");
        setData(body);
      })
      .catch(err => setError(err.message));
  }, []);

  const appTotals = useMemo(() => {
    const totals = { calamuchitar: 0, muchi: 0 };
    for (const item of data?.apps || []) totals[item.app_code] = numberValue(item.installed);
    return totals;
  }, [data]);

  const filteredInstallations = useMemo(() => (data?.installations || []).filter(item => {
    if (appFilter !== "all" && item.app_code !== appFilter) return false;
    return statusFilter === "all" || item.outcome === statusFilter;
  }), [appFilter, data, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInstallations.length / PAGE_SIZE));
  const visibleInstallations = filteredInstallations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [appFilter, statusFilter]);

  return (
    <main className="tags_pwa_installations_page">
      <div className="tags_pwa_installations_heading">
        <div>
          <span>MONITOREO DE APLICACIONES</span>
          <h1>Audiencia e instalaciones</h1>
          <p>Visitas, acciones, búsquedas e instalaciones de CalamuchitAr, Muchi y las páginas de clientes.</p>
        </div>
        <Link href="/dashboard">Volver al Panel</Link>
      </div>

      <nav className="tags_pwa_section_tabs" aria-label="Secciones de audiencia">
        <button type="button" className={section === "audience" ? "is_active" : ""} onClick={() => setSection("audience")}>Audiencia</button>
        <button type="button" className={section === "installations" ? "is_active" : ""} onClick={() => setSection("installations")}>Instalaciones</button>
      </nav>

      {section === "audience" && <AudienceAnalyticsPanel />}

      {section === "installations" && error && <div className="tags_pwa_installations_error">{error}</div>}
      {section === "installations" && !data && !error && <div className="tags_pwa_installations_loading">Cargando instalaciones…</div>}

      {section === "installations" && data && (
        <>
          <section className="tags_pwa_installations_kpis" aria-label="Resumen de instalaciones">
            <article><strong>{numberValue(data.summary?.total_installations)}</strong><span>Total instaladas</span></article>
            <article><strong>{appTotals.calamuchitar}</strong><span>CalamuchitAr</span></article>
            <article><strong>{appTotals.muchi}</strong><span>Muchi</span></article>
            <article><strong>{numberValue(data.summary?.total_cancelled)}</strong><span>Canceladas</span></article>
            <article><strong>{numberValue(data.summary?.total_attempts)}</strong><span>Intentos</span></article>
          </section>

          <section className="tags_pwa_installations_grid" aria-label="Instalaciones por aplicación y dominio">
            {(data.domains || []).map(item => {
              const brand = branding(item.app_code, item.domain);
              return (
                <article className="tags_pwa_domain_card" key={`${item.app_code}:${item.domain}`}>
                  <div className="tags_pwa_domain_identity">
                    <Image src={brand.logo} alt="" width={54} height={54} />
                    <div><strong>{brand.name}</strong><small>{item.domain}</small></div>
                  </div>
                  <div className="tags_pwa_domain_stats">
                    <div><b>{numberValue(item.installed)}</b><span>Instaladas</span></div>
                    <div><b>{numberValue(item.cancelled)}</b><span>Canceladas</span></div>
                    <div><b>{numberValue(item.attempts)}</b><span>Intentos</span></div>
                  </div>
                  <small className="tags_pwa_domain_last">Última actividad: {dateTime(item.last_activity)}</small>
                </article>
              );
            })}
          </section>

          <section className="tags_pwa_installations_history">
            <div className="tags_pwa_history_heading">
              <div>
                <span>DETALLE</span>
                <h2>Historial de instalaciones</h2>
                <p>{filteredInstallations.length} registros encontrados</p>
              </div>
              <div className="tags_pwa_history_filters">
                <label>
                  Aplicación
                  <select value={appFilter} onChange={event => setAppFilter(event.target.value)}>
                    <option value="all">Todas</option>
                    <option value="calamuchitar">CalamuchitAr</option>
                    <option value="muchi">Muchi</option>
                  </select>
                </label>
                <label>
                  Estado
                  <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                    <option value="all">Todos</option>
                    <option value="installed">Instalada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="tags_pwa_history_table_wrap">
              <table className="tags_pwa_history_table">
                <thead>
                  <tr>
                    <th>Aplicación</th>
                    <th>Fecha y hora</th>
                    <th>Dominio</th>
                    <th>Dispositivo</th>
                    <th>Estado</th>
                    <th>Intentos</th>
                    <th>Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleInstallations.map(item => {
                    const brand = branding(item.app_code, item.public_host);
                    const mapUrl = coordinatesLink(item);
                    return (
                      <tr key={item.id}>
                        <td data-label="Aplicación"><span className="tags_pwa_history_app"><Image src={brand.logo} alt="" width={28} height={28} />{brand.name}</span></td>
                        <td data-label="Fecha y hora">{dateTime(item.installed_at || item.last_seen_at)}</td>
                        <td data-label="Dominio">{item.public_host}</td>
                        <td data-label="Dispositivo">{item.platform || "Desconocido"}</td>
                        <td data-label="Estado"><span className={`tags_pwa_status tags_pwa_status_${item.outcome}`}>{item.outcome === "installed" ? "Instalada" : "Cancelada"}</span></td>
                        <td data-label="Intentos">{numberValue(item.prompt_count)}</td>
                        <td data-label="Ubicación">
                          {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer">Ver en el mapa{item.location_accuracy_m ? ` (±${Math.round(numberValue(item.location_accuracy_m))} m)` : ""}</a> : <span className="tags_pwa_no_location">No disponible</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {!visibleInstallations.length && <tr><td colSpan={7} className="tags_pwa_history_empty">No hay instalaciones para estos filtros.</td></tr>}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="tags_pwa_history_pagination">
                <button type="button" disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Anterior</button>
                <span>Página {page} de {totalPages}</span>
                <button type="button" disabled={page === totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))}>Siguiente</button>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
