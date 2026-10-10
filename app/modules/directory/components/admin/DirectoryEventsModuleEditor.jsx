"use client";

import { useState } from "react";
import { FaXmark } from "react-icons/fa6";
import "./DirectoryReviewsModuleEditor.css";
import "./DirectoryEventsModuleEditor.css";

export default function DirectoryEventsModuleEditor({ value, onClose, onSave }) {
    const [content, setContent] = useState(value?.content || {});
    const update = (field, nextValue) => setContent(current => ({ ...current, [field]: nextValue }));

    return <div className="tags_directory_reviews_editor_backdrop" onMouseDown={onClose}>
        <section className="tags_directory_reviews_editor" onMouseDown={event => event.stopPropagation()}>
            <header>
                <div><small>EVENTOS</small><h3>Presentación de eventos</h3></div>
                <button type="button" onClick={onClose} aria-label="Cerrar"><FaXmark /></button>
            </header>
            <div className="tags_directory_reviews_editor_body">
                <label>Nombre en el menú<input value={content.menuLabel || ""} onChange={event => update("menuLabel", event.target.value)} placeholder="Eventos" /></label>
                <label>Texto superior<input value={content.eyebrow || ""} onChange={event => update("eyebrow", event.target.value)} placeholder="EVENTOS" /></label>
                <label className="is_wide">Título<input value={content.title || ""} onChange={event => update("title", event.target.value)} /></label>
                <label className="is_wide">Descripción<textarea value={content.description || ""} onChange={event => update("description", event.target.value)} /></label>
                <label>Cantidad en la página<select value={Number(content.limit || 3)} onChange={event => update("limit", Number(event.target.value))}><option value={1}>1 evento</option><option value={2}>2 eventos</option><option value={3}>3 eventos</option><option value={6}>6 eventos</option></select></label>
                <fieldset className="is_wide"><legend>Apariencia</legend>
                    <label className="is_check"><input type="checkbox" checked={content.useDirectoryTheme !== false} onChange={event => update("useDirectoryTheme", event.target.checked)} /> Usar colores y esquinas definidos en Diseño</label>
                    <div className={content.useDirectoryTheme !== false ? "is_theme_inherited" : ""}>
                        <label>Fondo<input type="color" disabled={content.useDirectoryTheme !== false} value={content.backgroundColor || "#f3f7f5"} onChange={event => update("backgroundColor", event.target.value)} /></label>
                        <label>Tarjetas<input type="color" disabled={content.useDirectoryTheme !== false} value={content.surfaceColor || "#ffffff"} onChange={event => update("surfaceColor", event.target.value)} /></label>
                        <label>Texto<input type="color" disabled={content.useDirectoryTheme !== false} value={content.textColor || "#17231d"} onChange={event => update("textColor", event.target.value)} /></label>
                        <label>Color principal<input type="color" disabled={content.useDirectoryTheme !== false} value={content.accentColor || "#26734f"} onChange={event => update("accentColor", event.target.value)} /></label>
                        <label>Esquinas<select disabled={content.useDirectoryTheme !== false} value={content.borderRadius || "18px"} onChange={event => update("borderRadius", event.target.value)}><option value="0px">Rectas</option><option value="10px">Suaves</option><option value="18px">Redondeadas</option><option value="26px">Muy redondeadas</option></select></label>
                        <label>Espaciado<select value={content.padding || "24px"} onChange={event => update("padding", event.target.value)}><option value="12px">Compacto</option><option value="24px">Normal</option><option value="36px">Amplio</option></select></label>
                    </div>
                </fieldset>
            </div>
            <footer><button type="button" onClick={onClose}>Cancelar</button><button type="button" onClick={() => onSave(content)}>Guardar cambios</button></footer>
        </section>
    </div>;
}
