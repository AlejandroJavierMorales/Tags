"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaExternalLinkAlt, FaSearch } from "react-icons/fa";
import showAlert from "@/app/components/showAlert";
import PublicPageSeoFields from "@/app/components/seo/PublicPageSeoFields";

import "../../../../styles/tags_dashboard.css";
import "./page.css";

const labels = {
  directory: "Web del Directorio",
  portal: "Portal",
  store: "Tienda",
  resto: "Resto",
  turnos: "Turnos",
  client_reviews: "Reseñas",
};

export default function SeoIndexingClient({ businessId, pages = [], business }) {
  const [pageRows, setPageRows] = useState(pages);
  const [editingPage, setEditingPage] = useState(null);
  const [savingPage, setSavingPage] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return pageRows.filter((page) => {
      const matchesFilter = filter === "all"
        || (filter === "indexable" && page.isIndexable)
        || (filter === "blocked" && !page.isIndexable)
        || (filter === "directory" && page.isDirectory);
      const haystack = [page.title, page.slug, page.page_type, page.publicUrl].join(" ").toLowerCase();
      return matchesFilter && (!normalized || haystack.includes(normalized));
    });
  }, [filter, pageRows, query]);

  const indexableCount = pageRows.filter((page) => page.isIndexable).length;
  const warnings = pageRows.filter((page) => page.status === "published" && !page.publicUrl);

  async function toggleIndexing(page) {
    if (page.isDirectory) return;
    const nextValue = !page.isIndexable;
    const response = await fetch("/api/seo/indexing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, pageId: page.id, indexable: nextValue }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return showAlert({ title: "No se pudo actualizar", text: payload.error || "Revisá la configuración.", icon: "error" });
    setPageRows(current => current.map(item => item.id === page.id
      ? { ...item, isIndexable: nextValue, reason: nextValue ? "Permitida por la configuración SEO" : "Bloqueada por robots_index o por una regla de página" }
      : item));
  }

  async function saveSeo(page) {
    setSavingPage(true);
    try {
      const response = await fetch("/api/seo/page", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, pageId: page.id, ...page }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return showAlert({ title: "No se pudo guardar", text: payload.error || "Revisá los datos.", icon: "error" });
      setPageRows(current => current.map(item => item.id === page.id ? { ...item, ...page, isIndexable: Boolean(page.indexable), follow: Boolean(page.follow), reason: page.indexable ? "Permitida por la configuración SEO" : "Bloqueada por robots_index o por una regla de página" } : item));
      setEditingPage(null);
      await showAlert({ title: "SEO guardado", icon: "success", timer: 1200 });
    } finally { setSavingPage(false); }
  }

  return (
    <main className="tags_dashboard_page container-fluid py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <p className="text-muted mb-1">Visibilidad en buscadores</p>
          <h1 className="tags_title mb-2">SEO e indexación</h1>
          <p className="text-muted mb-0">{business?.name || "Negocio"}. Revisá qué páginas pueden aparecer en Google.</p>
        </div>
        <Link className="tags_dashboard_stats_btn" href={`/dashboard/businesses/${businessId}`}>
          Volver al panel
        </Link>
      </div>

      <section className="row g-3 mb-4">
        <div className="col-12 col-md-4"><div className="card h-100 p-3"><small className="text-muted">Páginas revisadas</small><strong className="fs-3">{pages.length}</strong></div></div>
        <div className="col-12 col-md-4"><div className="card h-100 p-3"><small className="text-muted">Indexables en Tags</small><strong className="fs-3 text-success">{indexableCount}</strong></div></div>
        <div className="col-12 col-md-4"><div className="card h-100 p-3"><small className="text-muted">Advertencias</small><strong className="fs-3 text-warning">{warnings.length}</strong></div></div>
      </section>

      <section className="tags_dashboard_table_card p-3">
        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
          <div className="input-group flex-grow-1" style={{ minWidth: 220 }}>
            <span className="input-group-text"><FaSearch /></span>
            <input className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar página, tipo o URL" />
          </div>
          <select className="form-select" style={{ maxWidth: 220 }} value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Todas</option>
            <option value="indexable">Indexables</option>
            <option value="blocked">No indexables</option>
            <option value="directory">Web del Directorio</option>
          </select>
        </div>

        <div className="tags_business_seo_table_wrap">
          <table className="table align-middle mb-0 tags_business_seo_table">
            <thead><tr><th>Página</th><th>URL pública</th><th>Estado SEO</th><th>Motivo</th><th /></tr></thead>
            <tbody>
              {filtered.map((page) => (
                <tr key={page.id}>
                  <td><strong>{page.title || page.slug || "Sin título"}</strong><small className="d-block text-muted">{labels[page.page_type] || page.page_type || "Página"}</small></td>
                  <td className="tags_business_seo_url">{page.publicUrl ? <a href={page.publicUrl} target="_blank" rel="noreferrer">{page.publicUrl} <FaExternalLinkAlt size={11} /></a> : <span className="text-muted">Sin URL</span>}</td>
                  <td>{page.isIndexable ? <span className="badge text-bg-success"><FaCheckCircle /> Indexable</span> : <span className="badge text-bg-secondary">No indexable</span>}<button type="button" className="btn btn-sm btn-link d-block p-0 mt-2" onClick={() => toggleIndexing(page)} disabled={page.isDirectory}>{page.isDirectory ? "Gestionada por el Directorio" : page.isIndexable ? "No indexar" : "Permitir indexación"}</button></td>
                  <td className="small text-muted tags_business_seo_reason">{page.reason}</td>
                  <td><button type="button" className="tags_business_seo_action" onClick={() => setEditingPage(page)}>Editar SEO</button></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="5" className="text-center text-muted py-4">No hay páginas para este filtro.</td></tr>}
            </tbody>
          </table>
        </div>

        {warnings.length > 0 && <div className="alert alert-warning mt-3 mb-0"><FaExclamationTriangle /> Hay páginas publicadas sin una URL pública resoluble. Revisalas antes de solicitar la indexación.</div>}
      </section>
      <PublicPageSeoFields page={editingPage} onChange={setEditingPage} onSave={saveSeo} onCancel={() => setEditingPage(null)} saving={savingPage} directory={editingPage?.isDirectory} />
    </main>
  );
}
