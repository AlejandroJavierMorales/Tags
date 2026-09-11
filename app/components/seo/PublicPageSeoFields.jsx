"use client";

export default function PublicPageSeoFields({ page, onChange, onSave, onCancel, saving = false, directory = false }) {
  if (!page) return null;
  const field = (name, value) => onChange({ ...page, [name]: value });
  return <section className="tags_dashboard_table_card tags_public_seo_editor p-3 mt-3">
    <div className="tags_portal_section_header"><div><small>SEO DE LA PÁGINA PÚBLICA</small><h2>{page.title || page.slug}</h2><p>Esta configuración se aplica igual a Store, Resto, Turnos, Reviews, Agency y QR-Page.</p></div><button type="button" className="tags_btn rounded" onClick={onCancel}>Cerrar</button></div>
    {directory && <div className="alert alert-info">Esta es una página del Directorio. Se indexa desde el dominio del Directorio, no desde <code>/p/</code>.</div>}
    <div className="row g-3">
      <label className="col-12 col-md-6">Título SEO<input className="form-control" value={page.seoTitle || ""} onChange={e => field("seoTitle", e.target.value)} /></label>
      <label className="col-12 col-md-6">URL canónica<input className="form-control" value={page.canonicalUrl || ""} onChange={e => field("canonicalUrl", e.target.value)} placeholder="Se genera automáticamente si queda vacío" /></label>
      <label className="col-12">Descripción SEO<textarea className="form-control" rows="3" value={page.seoDescription || ""} onChange={e => field("seoDescription", e.target.value)} /></label>
      <label className="col-12 col-md-6">Palabras clave<input className="form-control" value={page.seoKeywords || ""} onChange={e => field("seoKeywords", e.target.value)} /></label>
      <label className="col-12 col-md-6">Imagen SEO<input className="form-control" value={page.seoImageUrl || ""} onChange={e => field("seoImageUrl", e.target.value)} /></label>
      <label className="col-12 col-md-6 form-check form-switch ms-2"><input className="form-check-input" type="checkbox" checked={Boolean(page.indexable) && !directory} disabled={directory} onChange={e => field("indexable", e.target.checked)} /> <span className="form-check-label">Indexar en buscadores</span></label>
      <label className="col-12 col-md-6 form-check form-switch ms-2"><input className="form-check-input" type="checkbox" checked={Boolean(page.follow)} disabled={directory} onChange={e => field("follow", e.target.checked)} /> <span className="form-check-label">Seguir enlaces</span></label>
    </div>
    <div className="d-flex justify-content-end gap-2 mt-3"><button type="button" className="tags_btn rounded" onClick={onCancel}>Cancelar</button><button type="button" className="tags_btn rounded" onClick={() => onSave(page)} disabled={saving}>{saving ? "Guardando..." : "Guardar SEO"}</button></div>
  </section>;
}
