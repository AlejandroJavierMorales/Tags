"use client";

import { useEffect, useMemo, useState } from "react";
import { FaArrowRotateLeft, FaCheck, FaClockRotateLeft, FaDownload, FaFileExcel, FaImages, FaMagnifyingGlass, FaStore } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import "./ProductImportAdminPanel.css";

const MODE_OPTIONS = [
  ["create_only", "Crear solamente nuevos", "Los códigos existentes se omiten."],
  ["create_and_update", "Crear y actualizar", "Los códigos existentes se actualizarán y los nuevos se crearán."],
  ["update_only", "Actualizar solamente existentes", "Los códigos que todavía no existen se omiten."],
];

async function payload(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

export default function ProductImportAdminPanel() {
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [targetType, setTargetType] = useState("");
  const [overwriteMode, setOverwriteMode] = useState("create_only");
  const [file, setFile] = useState(null);
  const [images, setImages] = useState([]);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [undoingId, setUndoingId] = useState(null);

  useEffect(() => {
    fetch("/api/directory/admin/product-import/options", { cache: "no-store" })
      .then(async response => { const data = await payload(response);if (!response.ok) throw new Error(data.error || "No se pudo cargar");setBusinesses(data.businesses || []); })
      .catch(error => showAlert({ title: "No se pudo abrir el importador", text: error.message, icon: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    if (!term) return businesses;
    return businesses.filter(item => `${item.name} ${item.email}`.toLocaleLowerCase("es").includes(term));
  }, [businesses, search]);
  const selectedBusiness = businesses.find(item => String(item.id) === String(businessId));
  const selectedApplication = selectedBusiness?.applications?.find(item => item.type === targetType);

  async function loadHistory(selectedBusinessId = businessId) {
    if (!selectedBusinessId) { setHistory([]);setHistoryError("");return; }
    try { const response = await fetch(`/api/directory/admin/product-import/history?businessId=${selectedBusinessId}`, { cache: "no-store" });const data = await payload(response);if (!response.ok) throw new Error(data.error || "No se pudo cargar el historial");setHistory(data.imports || []);setHistoryError(""); }
    catch (error) { setHistory([]);setHistoryError(error.message); }
  }

  useEffect(() => { loadHistory(businessId); }, [businessId]);

  function selectBusiness(value) {
    const business = businesses.find(item => String(item.id) === String(value));
    setBusinessId(value);setTargetType(business?.applications?.length === 1 ? business.applications[0].type : "");setFile(null);setImages([]);setReport(null);
  }

  function selectTarget(value) { setTargetType(value);setFile(null);setImages([]);setReport(null); }

  function downloadTemplate() {
    if (!businessId || !targetType) return;
    const params = new URLSearchParams({ businessId: String(businessId), targetType });
    window.location.href = `/api/directory/admin/product-import/template?${params}`;
  }

  async function review() {
    if (!businessId || !targetType || !file) return showAlert({ title: "Faltan datos", text: "Seleccioná prestador, aplicativo y archivo Excel.", icon: "warning" });
    const form = new FormData();form.append("businessId", businessId);form.append("targetType", targetType);form.append("overwriteMode", overwriteMode);form.append("file", file);for (const image of images) form.append("images", image);
    setReviewing(true);setReport(null);
    try {
      const response = await fetch("/api/directory/admin/product-import/preview", { method: "POST", body: form });const data = await payload(response);if (!response.ok) throw new Error(data.error || "No se pudo revisar el archivo");setReport(data.report);
      if (data.ok) await showAlert({ title: "Archivo revisado", text: "No se encontraron errores. Esta vista previa no importó ningún producto.", icon: "success", timer: 1800 });
    } catch (error) { await showAlert({ title: "No se pudo revisar", text: error.message, icon: "error" }); }
    finally { setReviewing(false); }
  }

  async function commit() {
    if (!report || report.globalErrors.length || report.products.errors || report.variants.errors) return;
    const confirmed = await showAlert({ title: "¿Confirmar importación?", text: `${selectedBusiness.name} · ${selectedApplication.label}. Se crearán ${report.products.create}, se actualizarán ${report.products.update} y se omitirán ${report.products.skip}.`, icon: "warning", showCancelButton: true, confirmButtonText: "Sí, importar", cancelButtonText: "Volver" });
    if (!confirmed) return;
    const form = new FormData();form.append("businessId", businessId);form.append("targetType", targetType);form.append("overwriteMode", overwriteMode);form.append("file", file);for (const image of images) form.append("images", image);
    setImporting(true);
    try { const response = await fetch("/api/directory/admin/product-import/commit", { method: "POST", body: form });const data = await payload(response);if (!response.ok) { if (data.report) setReport(data.report);throw new Error(data.error || "No se pudo importar"); }await showAlert({ title: "Importación completada", text: `Lote #${data.batchId}: ${data.created} creados, ${data.updated} actualizados y ${data.skipped} omitidos.`, icon: "success" });setFile(null);setImages([]);setReport(null);await loadHistory(); }
    catch (error) { await showAlert({ title: "No se pudo importar", text: error.message, icon: "error" }); }
    finally { setImporting(false); }
  }

  async function undo(item) {
    const confirmed = await showAlert({ title: `¿Deshacer importación #${item.id}?`, text: "Se eliminarán los productos creados y se restaurará el estado anterior de los actualizados. Si hubo cambios posteriores, la operación será bloqueada.", icon: "warning", showCancelButton: true, confirmButtonText: "Deshacer", cancelButtonText: "Cancelar" });
    if (!confirmed) return;setUndoingId(item.id);
    try { const response = await fetch("/api/directory/admin/product-import/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: item.id }) });const data = await payload(response);if (!response.ok) throw new Error(data.error || "No se pudo deshacer");await showAlert({ title: "Importación deshecha", text: `El lote #${item.id} fue revertido.`, icon: "success" });await loadHistory(); }
    catch (error) { await showAlert({ title: "No se pudo deshacer", text: error.message, icon: "error" }); }
    finally { setUndoingId(null); }
  }

  if (loading) return <div className="tags_product_import_loading"><TagsSpinner /></div>;

  return <section className="tags_product_import_admin">
    <header><div><span>IMPORTACIÓN ASISTIDA</span><h2><FaFileExcel /> Importar Catálogo, Tienda o Carta</h2><p>Seleccioná el prestador, descargá su plantilla personalizada y revisá la información antes de importarla.</p></div><strong>Nada se importa sin confirmación</strong></header>

    <div className="tags_product_import_steps">
      <article><b>1</b><div><h3>Prestador</h3><p>Buscá y seleccioná el negocio.</p></div></article>
      <article><b>2</b><div><h3>Aplicativo</h3><p>Catálogo, Tienda o Carta.</p></div></article>
      <article><b>3</b><div><h3>Archivo</h3><p>Cargá Excel e imágenes.</p></div></article>
      <article><b>4</b><div><h3>Revisión</h3><p>Corregí errores antes de importar.</p></div></article>
    </div>

    <div className="tags_product_import_form">
      <label className="tags_product_import_search"><span>Buscar prestador</span><div><FaMagnifyingGlass /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre o email" /></div></label>
      <label><span>Prestador</span><select value={businessId} onChange={event => selectBusiness(event.target.value)}><option value="">Seleccionar prestador</option>{filtered.map(item => <option value={item.id} key={item.id}>{item.name}{item.email ? ` · ${item.email}` : ""}</option>)}</select></label>

      {selectedBusiness && <div className="tags_product_import_apps"><span>Aplicativo</span><div>{selectedBusiness.applications.map(item => <button type="button" className={targetType === item.type ? "active" : ""} onClick={() => selectTarget(item.type)} key={item.type}><FaStore /><strong>{item.label}</strong><small>{item.productCount} producto(s)</small></button>)}</div></div>}

      {selectedApplication && <div className="tags_product_import_template"><div><strong>Plantilla personalizada para {selectedBusiness.name}</strong><span>Incluye las categorías cargadas actualmente en {selectedApplication.label}.</span></div><button type="button" onClick={downloadTemplate}><FaDownload /> Descargar plantilla</button></div>}

      {selectedApplication && <div className="tags_product_import_files">
        <label><span>Excel completado *</span><div className={file ? "has_file" : ""}><FaFileExcel /><strong>{file?.name || "Seleccionar archivo .xlsx"}</strong><input key={file ? `excel-${file.name}-${file.lastModified}` : "excel-empty"} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => { setFile(event.target.files?.[0] || null);setReport(null); }} /></div></label>
        <label><span>Imágenes mencionadas en el Excel</span><div className={images.length ? "has_file" : ""}><FaImages /><strong>{images.length ? `${images.length} imagen(es) seleccionada(s)` : "Seleccionar JPG, PNG, WEBP o AVIF"}</strong><input key={images.length ? `images-${images.map(image => `${image.name}-${image.lastModified}`).join("|")}` : "images-empty"} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={event => { setImages(Array.from(event.target.files || []));setReport(null); }} /></div></label>
      </div>}

      {file && <fieldset><legend>Qué hacer con códigos existentes</legend>{MODE_OPTIONS.map(([value, label, description]) => <label className="tags_product_import_mode" key={value}><input type="radio" name="overwriteMode" checked={overwriteMode === value} onChange={() => { setOverwriteMode(value);setReport(null); }} /><span><strong>{label}</strong><small>{description}</small></span></label>)}</fieldset>}

      {file && <button type="button" className="tags_product_import_review" onClick={review} disabled={reviewing}>{reviewing ? <><TagsSpinner /> Revisando...</> : <><FaMagnifyingGlass /> Revisar archivo sin importar</>}</button>}
    </div>

    {report && <ImportPreviewReport report={report} onCommit={commit} importing={importing} />}
    {selectedBusiness && <ImportHistory items={history} error={historyError} undoingId={undoingId} onUndo={undo} />}
  </section>;
}

function ImportPreviewReport({ report, onCommit, importing }) {
  const blocked = report.globalErrors.length || report.products.errors || report.variants.errors;
  return <div className={`tags_product_import_report ${blocked ? "has_errors" : "is_ready"}`}>
    <header><div><span>{blocked ? "REQUIERE CORRECCIONES" : "LISTO PARA IMPORTAR"}</span><h3>{report.target.businessName} · {report.target.targetLabel}</h3><p>Esta revisión no modificó la base de datos.</p></div><strong>{report.products.total} producto(s)</strong></header>
    <div className="tags_product_import_totals"><span><b>{report.products.create}</b>Nuevos</span><span><b>{report.products.update}</b>Actualizar</span><span><b>{report.products.skip}</b>Omitir</span><span><b>{report.products.errors}</b>Con errores</span><span><b>{report.images.selected}</b>Imágenes</span>{report.variants.total > 0 && <span><b>{report.variants.total}</b>Variantes</span>}</div>
    {(report.globalErrors.length > 0 || report.globalWarnings.length > 0) && <div className="tags_product_import_messages">{report.globalErrors.map((message, index) => <p className="error" key={`e-${index}`}>{message}</p>)}{report.globalWarnings.map((message, index) => <p className="warning" key={`w-${index}`}>{message}</p>)}</div>}
    {report.categories.new.length > 0 && <p className="tags_product_import_new_categories"><strong>Categorías nuevas detectadas:</strong> {report.categories.new.join(", ")}</p>}
    <div className="tags_product_import_table"><table><thead><tr><th>Fila</th><th>Código</th><th>Producto</th><th>Categoría</th><th>Acción</th><th>Resultado</th></tr></thead><tbody>{report.products.rows.map(item => <tr className={item.valid ? "" : "invalid"} key={item.row}><td>{item.row}</td><td>{item.code || "—"}</td><td>{item.name || "—"}</td><td>{item.category || "—"}</td><td><span className={`action ${item.action}`}>{item.action === "create" ? "Crear" : item.action === "update" ? "Actualizar" : "Omitir"}</span></td><td>{item.errors.map(message => <small className="error" key={message}>{message}</small>)}{item.warnings.map(message => <small className="warning" key={message}>{message}</small>)}{item.valid && !item.warnings.length && <small className="ok">Correcto</small>}</td></tr>)}</tbody></table></div>
    {report.variants.errors > 0 && <div className="tags_product_import_variant_errors"><h4>Errores en variantes</h4>{report.variants.rows.filter(item => item.errors?.length).map(item => <p key={item.row}>Fila {item.row}: {item.errors.join(" · ")}</p>)}</div>}
    <footer><div><strong>{blocked ? "Todavía no se puede importar" : "Validación completada"}</strong><span>{blocked ? "Corregí el Excel o seleccioná las imágenes faltantes y volvé a revisarlo." : "La importación volverá a validar el archivo y guardará un historial para poder deshacerla."}</span></div>{!blocked && <button type="button" onClick={onCommit} disabled={importing}>{importing ? "Importando..." : <><FaCheck /> Confirmar importación</>}</button>}</footer>
  </div>;
}

function ImportHistory({ items, error, undoingId, onUndo }) {
  return <section className="tags_product_import_history"><header><div><span>HISTORIAL</span><h3><FaClockRotateLeft /> Importaciones anteriores</h3></div></header>{error && <p className="tags_product_import_history_error">{error}</p>}{!error && !items.length && <p className="tags_product_import_history_empty">Todavía no hay importaciones para este prestador.</p>}{items.map(item => <article key={item.id}><div><strong>#{item.id} · {item.target_type === "catalog" ? "Catálogo" : item.target_type === "store" ? "Tienda" : "Carta"}</strong><small>{item.original_filename}</small><small>{new Date(item.created_at).toLocaleString("es-AR")}</small></div><div><span className={`status ${item.status}`}>{item.status === "completed" ? "Completada" : item.status === "undone" ? "Deshecha" : item.status === "failed" ? "Fallida" : item.status}</span><small>{item.created_count} creados · {item.updated_count} actualizados · {item.skipped_count} omitidos</small>{Number(item.can_undo) === 1 && <button type="button" onClick={() => onUndo(item)} disabled={undoingId === item.id}><FaArrowRotateLeft /> {undoingId === item.id ? "Deshaciendo..." : "Deshacer"}</button>}</div></article>)}</section>;
}
