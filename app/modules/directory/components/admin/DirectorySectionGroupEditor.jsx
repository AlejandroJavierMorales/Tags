"use client";

import { useMemo, useState } from "react";
import { FaArrowDown, FaArrowUp, FaImage, FaTrash, FaXmark } from "react-icons/fa6";
import MediaUploader from "@/app/components/MediaUploader";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import { isDirectorySectionGroupable } from "../../lib/directorySectionGroups";
import "./DirectorySectionGroupEditor.css";

export default function DirectorySectionGroupEditor({ businessId, pageId, group, groups = [], sections = [], onClose, onSave }) {
  const [draft, setDraft] = useState({ ...group, sectionIds: [...(group.sectionIds || [])] });
  const [saving, setSaving] = useState(false);
  const eligibleSections = useMemo(
    () => sections.filter(isDirectorySectionGroupable).sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
    [sections]
  );
  const sectionById = useMemo(() => new Map(eligibleSections.map(section => [Number(section.id), section])), [eligibleSections]);
  const ownerBySection = useMemo(() => {
    const owners = new Map();
    groups.filter(item => item.id !== group.id).forEach(item => {
      item.sectionIds.forEach(sectionId => owners.set(Number(sectionId), item.title));
    });
    return owners;
  }, [groups, group.id]);

  const update = (field, value) => setDraft(current => ({ ...current, [field]: value }));
  const toggleSection = sectionId => setDraft(current => ({
    ...current,
    sectionIds: current.sectionIds.includes(sectionId)
      ? current.sectionIds.filter(id => id !== sectionId)
      : [...current.sectionIds, sectionId]
  }));
  const moveSection = (index, direction) => setDraft(current => {
    const target = index + direction;
    if (target < 0 || target >= current.sectionIds.length) return current;
    const sectionIds = [...current.sectionIds];
    [sectionIds[index], sectionIds[target]] = [sectionIds[target], sectionIds[index]];
    return { ...current, sectionIds };
  });

  async function save() {
    if (!draft.title.trim()) return showAlert({ title: "Ingresá el nombre del grupo", icon: "warning" });
    if (!draft.sectionIds.length) return showAlert({ title: "Seleccioná al menos una sección", text: "El grupo necesita contenido para poder mostrarse.", icon: "warning" });
    setSaving(true);
    try {
      await onSave({ ...draft, title: draft.title.trim(), eyebrow: draft.eyebrow.trim(), description: draft.description.trim() });
    } finally { setSaving(false); }
  }

  return <div className="tags_directory_group_editor_overlay" role="dialog" aria-modal="true">
    <div className="tags_directory_group_editor">
      {saving && <div className="tags_directory_group_editor_busy"><TagsSpinner /></div>}
      <header>
        <div><small>GRUPO DE SECCIONES</small><h2>{group.isNew ? "Crear grupo" : "Editar grupo"}</h2></div>
        <button type="button" onClick={onClose} aria-label="Cerrar"><FaXmark /></button>
      </header>

      <div className="tags_directory_group_editor_body">
        <section>
          <h3>Presentación del grupo</h3>
          <div className="tags_directory_group_editor_grid">
            <label>Nombre del grupo<input value={draft.title} onChange={event => update("title", event.target.value)} placeholder="Asesoría Previsional" /></label>
            <label>Texto superior<input value={draft.eyebrow} onChange={event => update("eyebrow", event.target.value)} placeholder="SERVICIOS" /></label>
            <label className="wide">Introducción<textarea value={draft.description} onChange={event => update("description", event.target.value)} placeholder="Conocé las gestiones y alternativas disponibles." /></label>
            <label>Presentación de los ítems<select value={draft.layout} onChange={event => update("layout", event.target.value)}><option value="cards">Tarjetas internas</option><option value="accordion">Acordeón desplegable</option></select></label>
            <label className="tags_directory_group_editor_visible"><input type="checkbox" checked={draft.enabled !== false} onChange={event => update("enabled", event.target.checked)} />Mostrar este grupo en la Web</label>
          </div>
        </section>

        <section>
          <div className="tags_directory_group_editor_heading"><div><h3>Imagen opcional</h3><p>Se mostrará en el encabezado de la tarjeta agrupadora.</p></div><MediaUploader businessId={businessId} value="" module="directory" variant="gallery" entityId={pageId} accept="image/*" label={draft.imageUrl ? "Cambiar imagen" : "Agregar imagen"} onChange={media => { if (media?.url) setDraft(current => ({ ...current, imageUrl: media.url, imageAlt: current.imageAlt || current.title })); }} /></div>
          {draft.imageUrl && <div className="tags_directory_group_editor_image"><img src={draft.imageUrl} alt={draft.imageAlt || ""} /><div><label>Texto alternativo<input value={draft.imageAlt || ""} onChange={event => update("imageAlt", event.target.value)} /></label><button type="button" onClick={() => setDraft(current => ({ ...current, imageUrl: "", imageAlt: "" }))}><FaTrash /> Quitar imagen</button></div></div>}
          {!draft.imageUrl && <div className="tags_directory_group_editor_image_empty"><FaImage /><span>El grupo puede mostrarse sin imagen.</span></div>}
        </section>

        <section>
          <div className="tags_directory_group_editor_heading"><div><h3>Secciones incluidas</h3><p>Una sección solamente puede pertenecer a un grupo.</p></div><strong>{draft.sectionIds.length} seleccionadas</strong></div>
          <div className="tags_directory_group_editor_options">{eligibleSections.map(section => {
            const sectionId = Number(section.id);
            const owner = ownerBySection.get(sectionId);
            return <label className={owner ? "is_disabled" : ""} key={sectionId}><input type="checkbox" checked={draft.sectionIds.includes(sectionId)} disabled={Boolean(owner)} onChange={() => toggleSection(sectionId)} /><span><strong>{section.title || "Sección sin título"}</strong>{owner && <small>Ya pertenece a “{owner}”</small>}</span></label>;
          })}</div>
          {!eligibleSections.length && <p className="tags_directory_group_editor_empty">Primero agregá secciones de contenido para poder formar un grupo.</p>}
        </section>

        {draft.sectionIds.length > 0 && <section>
          <h3>Orden dentro del grupo</h3>
          <div className="tags_directory_group_editor_order">{draft.sectionIds.map((sectionId, index) => {
            const section = sectionById.get(Number(sectionId));
            if (!section) return null;
            return <article key={sectionId}><span>{index + 1}</span><strong>{section.title || "Sección sin título"}</strong><div><button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label="Subir"><FaArrowUp /></button><button type="button" onClick={() => moveSection(index, 1)} disabled={index === draft.sectionIds.length - 1} aria-label="Bajar"><FaArrowDown /></button></div></article>;
          })}</div>
        </section>}
      </div>

      <footer><button type="button" className="secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" onClick={save} disabled={saving}>Guardar grupo</button></footer>
    </div>
  </div>;
}
