"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaArrowsRotate,
  FaCircleCheck,
  FaCircleExclamation,
  FaLocationDot,
  FaMap,
  FaPen,
  FaRoute,
  FaFloppyDisk,
  FaSignsPost,
  FaXmark,
} from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./ruta100TerritorialDiagnostic.css";

const SUMMARY_ITEMS = [
  ["Corredores", "corridorTotal", FaRoute],
  ["Tramos", "segmentTotal", FaSignsPost],
  ["Localidades perfiladas", "placeProfileTotal", FaLocationDot],
  ["Experiencias", "experienceTotal", FaMap],
  ["Contenidos turísticos", "tourismContentPublished", FaCircleCheck],
];

const STATUS_LABELS = {
  draft: "Borrador",
  in_review: "En revisión",
  observed: "Observado",
  published: "Publicado",
  hidden: "Oculto",
  archived: "Archivado",
};

function formFromEntity(entityType, item) {
  if (entityType === "corridor") {
    return {
      name: item.name || "",
      eyebrow: item.eyebrow || "",
      summary: item.summary || "",
      description: item.description || "",
      distanceKm: item.distance_km || "",
      status: item.status || "draft",
    };
  }
  return {
    name: item.name || "",
    shortName: item.short_name || "",
    summary: item.summary || "",
    description: item.description || "",
    sortOrder: Number(item.sort_order || 0),
    seoTitle: item.seo_title || "",
    seoDescription: item.seo_description || "",
    status: item.status || "draft",
  };
}

function EditorialStatus({ value }) {
  return <span className={`ruta100_editorial_status ${value || "draft"}`}>{STATUS_LABELS[value] || value}</span>;
}

function formatDbDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "Sin fecha";
}

function StatusPill({ ready }) {
  return (
    <span className={`ruta100_diagnostic_status ${ready ? "ready" : "warning"}`}>
      {ready ? <FaCircleCheck /> : <FaCircleExclamation />}
      {ready ? "Esquema disponible" : "Esquema incompleto"}
    </span>
  );
}

export default function Ruta100TerritorialDiagnostic() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async ({ notify = false } = {}) => {
    setLoading(true);
    try {
      const response = await fetch("/api/directory/admin/ruta100/bootstrap", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar el diagnóstico territorial.");
      setData(payload);
      if (notify) {
        await showAlert({ title: "Diagnóstico actualizado", icon: "success", timer: 1200 });
      }
    } catch (error) {
      await showAlert({ title: "No se pudo cargar Ruta 100", text: error.message, icon: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary || {};
  const schema = data?.schema || { ready: false, availableTables: [], missingTables: [] };

  function openEditor(entityType, item) {
    setEditor({ entityType, entityId: item.id, immutableCode: item.code, values: formFromEntity(entityType, item) });
  }

  function setEditorValue(field, value) {
    setEditor((current) => ({ ...current, values: { ...current.values, [field]: value } }));
  }

  async function saveEditor(event) {
    event.preventDefault();
    if (!editor || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/directory/admin/ruta100/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editor),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar el contenido.");
      setEditor(null);
      await load();
      await showAlert({ title: "Contenido actualizado", icon: "success", timer: 1300 });
    } catch (error) {
      await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="ruta100_diagnostic_page">
      {loading && <div className="ruta100_diagnostic_busy"><TagsSpinner size={110} logoSize={58} /></div>}

      <header className="ruta100_diagnostic_header">
        <div>
          <span>RUTA 100 CÓRDOBA</span>
          <h1>Diagnóstico territorial</h1>
          <p>Estado técnico y contenido disponible para construir el corredor, sin modificar datos.</p>
        </div>
        <button type="button" onClick={() => load({ notify: true })} disabled={loading}>
          <FaArrowsRotate /> Actualizar diagnóstico
        </button>
      </header>

      {data && (
        <>
          <section className="ruta100_diagnostic_site">
            <div>
              <small>Directorio reconocido</small>
              <strong>{data.site?.name || "Ruta 100 Córdoba"}</strong>
              <span>{data.site?.primary_host || data.site?.code}</span>
            </div>
            <StatusPill ready={schema.ready} />
          </section>

          {schema.ready && data.summary ? (
            <section className="ruta100_diagnostic_summary" aria-label="Resumen territorial">
              {SUMMARY_ITEMS.map(([label, key, Icon]) => (
                <article key={key}>
                  <Icon />
                  <div><strong>{Number(summary[key] || 0)}</strong><span>{label}</span></div>
                </article>
              ))}
            </section>
          ) : (
            <section className="ruta100_diagnostic_warning">
              <FaCircleExclamation />
              <div>
                <strong>Faltan tablas territoriales</strong>
                <p>{schema.missingTables?.join(", ") || "No se pudo verificar el esquema."}</p>
              </div>
            </section>
          )}

          <section className="ruta100_diagnostic_details">
            <article>
              <header><h2>Infraestructura</h2><span>{schema.availableTables?.length || 0}/9 tablas</span></header>
              <p>La pantalla verifica únicamente las tablas exclusivas del corredor Ruta 100.</p>
              <ul>
                {(schema.availableTables || []).map((table) => <li key={table}><FaCircleCheck /> {table}</li>)}
              </ul>
            </article>

            <article>
              <header><h2>Contenido cargado</h2><span>Solo lectura</span></header>
              <p>Estos listados se completarán cuando comience la carga editorial controlada.</p>
              <dl>
                <div><dt>Corredores publicados</dt><dd>{Number(summary.corridorPublished || 0)}</dd></div>
                <div><dt>Fuentes turísticas activas</dt><dd>{Number(summary.tourismSourceActive || 0)}</dd></div>
                <div><dt>Corredores registrados</dt><dd>{data.corridors?.length || 0}</dd></div>
                <div><dt>Experiencias registradas</dt><dd>{data.experiences?.length || 0}</dd></div>
              </dl>
            </article>
          </section>

          <section className="ruta100_editorial_section">
            <header>
              <div><span>CONTENIDO EDITORIAL</span><h2>Corredor principal</h2><p>Información general verificada del recorrido.</p></div>
            </header>
            {(data.corridors || []).length ? data.corridors.map((corridor) => (
              <article className="ruta100_corridor_card" key={corridor.id}>
                <div className="ruta100_corridor_identity">
                  <div><EditorialStatus value={corridor.status} /><small>{corridor.code}</small></div>
                  <h3>{corridor.name}</h3>
                  <p>{corridor.summary}</p>
                  <dl>
                    <div><dt>Distancia</dt><dd>{Number(corridor.distance_km || 0).toLocaleString("es-AR")} km</dd></div>
                    <div><dt>Fuente revisada</dt><dd>{formatDbDate(corridor.source_checked_at)}</dd></div>
                  </dl>
                </div>
                <button type="button" onClick={() => openEditor("corridor", corridor)}><FaPen /> Editar corredor</button>
              </article>
            )) : <p className="ruta100_editorial_empty">Todavía no hay un corredor cargado.</p>}
          </section>

          <section className="ruta100_editorial_section">
            <header>
              <div><span>PROPUESTAS TEMÁTICAS</span><h2>Experiencias</h2><p>Las diez formas oficiales de recorrer y descubrir Ruta 100.</p></div>
              <strong>{data.experiences?.length || 0} registradas</strong>
            </header>
            <div className="ruta100_experience_grid">
              {(data.experiences || []).map((experience) => (
                <article key={experience.id}>
                  <div className="ruta100_experience_order">{Number(experience.sort_order || 0)}</div>
                  <div className="ruta100_experience_content">
                    <EditorialStatus value={experience.status} />
                    <h3>{experience.name}</h3>
                    <p>{experience.summary}</p>
                    <small>/{experience.slug}</small>
                  </div>
                  <button type="button" aria-label={`Editar ${experience.name}`} onClick={() => openEditor("experience", experience)}><FaPen /></button>
                </article>
              ))}
            </div>
          </section>

          <section className="ruta100_editorial_sources">
            <header><div><span>EVIDENCIA</span><h2>Fuentes vinculadas</h2></div></header>
            {(data.sources || []).map((source) => (
              <article key={source.id}>
                <div><strong>{source.name}</strong><small>{source.source_kind} · {STATUS_LABELS[source.status] || source.status}</small></div>
                {source.website_url && <a href={source.website_url} target="_blank" rel="noreferrer">Abrir fuente oficial</a>}
              </article>
            ))}
          </section>

          <aside className="ruta100_diagnostic_note">
            Esta herramienta permite edición editorial auditada, pero no publica contenido ni modifica CalamuchitAr.
          </aside>
        </>
      )}

      {editor && (
        <div className="ruta100_editorial_overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditor(null); }}>
          <section className="ruta100_editorial_modal" role="dialog" aria-modal="true" aria-labelledby="ruta100-editor-title">
            <button className="ruta100_editorial_close" type="button" aria-label="Cerrar" onClick={() => setEditor(null)} disabled={saving}><FaXmark /></button>
            <header>
              <span>{editor.entityType === "corridor" ? "CORREDOR" : "EXPERIENCIA"}</span>
              <h2 id="ruta100-editor-title">Editar contenido</h2>
              <p>El código <strong>{editor.immutableCode}</strong> es estable y no se modifica.</p>
            </header>
            <form onSubmit={saveEditor}>
              <label>Nombre<input value={editor.values.name} maxLength={190} required onChange={(event) => setEditorValue("name", event.target.value)} /></label>
              {editor.entityType === "corridor" ? (
                <>
                  <label>Antetítulo<input value={editor.values.eyebrow} maxLength={190} onChange={(event) => setEditorValue("eyebrow", event.target.value)} /></label>
                  <label>Distancia en kilómetros<input type="number" min="0.01" max="9999999" step="0.01" value={editor.values.distanceKm} required onChange={(event) => setEditorValue("distanceKm", event.target.value)} /></label>
                </>
              ) : (
                <div className="ruta100_editorial_two">
                  <label>Nombre corto<input value={editor.values.shortName} maxLength={120} onChange={(event) => setEditorValue("shortName", event.target.value)} /></label>
                  <label>Orden<input type="number" min="0" max="10000" step="1" value={editor.values.sortOrder} required onChange={(event) => setEditorValue("sortOrder", event.target.value)} /></label>
                </div>
              )}
              <label>Resumen<textarea value={editor.values.summary} maxLength={1000} required onChange={(event) => setEditorValue("summary", event.target.value)} /></label>
              <label>Descripción ampliada<textarea className="large" value={editor.values.description} maxLength={50000} onChange={(event) => setEditorValue("description", event.target.value)} /></label>
              {editor.entityType === "experience" && (
                <>
                  <label>Título SEO<input value={editor.values.seoTitle} maxLength={255} onChange={(event) => setEditorValue("seoTitle", event.target.value)} /></label>
                  <label>Descripción SEO<textarea value={editor.values.seoDescription} maxLength={500} onChange={(event) => setEditorValue("seoDescription", event.target.value)} /></label>
                </>
              )}
              <label>Estado editorial
                <select value={editor.values.status} onChange={(event) => setEditorValue("status", event.target.value)}>
                  <option value="draft">Borrador</option>
                  <option value="in_review">En revisión</option>
                  <option value="observed">Observado</option>
                </select>
              </label>
              <p className="ruta100_editorial_form_note">Guardar no publica la página. Cada modificación queda registrada en auditoría.</p>
              <button className="ruta100_editorial_save" type="submit" disabled={saving}><FaFloppyDisk /> {saving ? "Guardando…" : "Guardar cambios"}</button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
