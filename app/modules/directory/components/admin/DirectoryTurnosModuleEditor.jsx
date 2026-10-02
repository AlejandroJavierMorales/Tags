"use client";

import { useState } from "react";
import { FaArrowDown, FaArrowUp, FaXmark } from "react-icons/fa6";
import "./DirectoryTurnosModuleEditor.css";

export default function DirectoryTurnosModuleEditor({ value, apps = [], onClose, onSave }) {
  const [content, setContent] = useState(value?.content || {});
  const configured = Array.isArray(content.visibleAppIds) ? content.visibleAppIds.map(Number) : apps.map(item => Number(item.id));
  const orderedIds = [...configured.filter(id => apps.some(item => Number(item.id) === id)), ...apps.map(item => Number(item.id)).filter(id => !configured.includes(id))];
  const update = (field, nextValue) => setContent(current => ({ ...current, [field]: nextValue }));
  const visibleIds = new Set(configured);

  function toggleApp(id) {
    const next = visibleIds.has(id) ? configured.filter(item => item !== id) : [...configured, id];
    update("visibleAppIds", next);
  }

  function moveApp(id, direction) {
    const index = configured.indexOf(id), target = index + direction;
    if (index < 0 || target < 0 || target >= configured.length) return;
    const next = [...configured];
    [next[index], next[target]] = [next[target], next[index]];
    update("visibleAppIds", next);
  }

  return <div className="tags_directory_turnos_editor_backdrop" onMouseDown={onClose}>
    <section className="tags_directory_turnos_editor" onMouseDown={event => event.stopPropagation()}>
      <header><div><small>TAGS TURNOS</small><h3>Presentación de Reservas</h3></div><button type="button" onClick={onClose} aria-label="Cerrar"><FaXmark /></button></header>
      <div className="tags_directory_turnos_editor_body">
        <label>Nombre en el menú<input value={content.menuLabel || ""} onChange={event => update("menuLabel", event.target.value)} placeholder="Reservas" /></label>
        <label>Texto superior<input value={content.eyebrow || ""} onChange={event => update("eyebrow", event.target.value)} placeholder="RESERVAS ONLINE" /></label>
        <label className="is_wide">Título<input value={content.title || ""} onChange={event => update("title", event.target.value)} placeholder="Reservá tu próximo turno" /></label>
        <label className="is_wide">Descripción<textarea value={content.description || ""} onChange={event => update("description", event.target.value)} placeholder="Elegí la actividad, el día y el horario que prefieras." /></label>
        <label className="is_check is_wide"><input type="checkbox" checked={content.showIntro !== false} onChange={event => update("showIntro", event.target.checked)} /> Mostrar presentación del bloque</label>
        <fieldset className="is_wide"><legend>Apariencia</legend><div>
          <label>Fondo<input type="color" value={content.backgroundColor || "#f3f7f5"} onChange={event => update("backgroundColor", event.target.value)} /></label>
          <label>Tarjetas<input type="color" value={content.surfaceColor || "#ffffff"} onChange={event => update("surfaceColor", event.target.value)} /></label>
          <label>Texto<input type="color" value={content.textColor || "#17231d"} onChange={event => update("textColor", event.target.value)} /></label>
          <label>Color principal<input type="color" value={content.accentColor || "#26734f"} onChange={event => update("accentColor", event.target.value)} /></label>
          <label>Esquinas<select value={content.borderRadius || "18px"} onChange={event => update("borderRadius", event.target.value)}><option value="0px">Rectas</option><option value="10px">Suaves</option><option value="18px">Redondeadas</option><option value="26px">Muy redondeadas</option></select></label>
          <label>Espaciado<select value={content.padding || "24px"} onChange={event => update("padding", event.target.value)}><option value="12px">Compacto</option><option value="24px">Normal</option><option value="36px">Amplio</option></select></label>
        </div></fieldset>
        <fieldset className="is_wide"><legend>Agendas visibles</legend><div className="tags_directory_turnos_editor_apps">{orderedIds.map((id, index) => { const app = apps.find(item => Number(item.id) === id); const visible = visibleIds.has(id); return <article key={id}><label><input type="checkbox" checked={visible} onChange={() => toggleApp(id)} /><span><strong>{app?.name}</strong><small>{visible ? "Visible en la Web" : "Oculta"}</small></span></label><nav><button type="button" disabled={!visible || index === 0} onClick={() => moveApp(id, -1)}><FaArrowUp /></button><button type="button" disabled={!visible || index === configured.length - 1} onClick={() => moveApp(id, 1)}><FaArrowDown /></button></nav></article>; })}</div></fieldset>
      </div>
      <footer><button type="button" onClick={onClose}>Cancelar</button><button type="button" onClick={() => onSave(content)}>Guardar cambios</button></footer>
    </section>
  </div>;
}
