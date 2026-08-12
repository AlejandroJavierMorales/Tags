"use client";

import { useState } from "react";
import { FaXmark } from "react-icons/fa6";
import "./DirectoryReviewsModuleEditor.css";

export default function DirectoryReviewsModuleEditor({ code, value, onClose, onSave }) {
    const [content, setContent] = useState(value?.content || {});
    const invitation = code === "reviewsInvitation";
    function update(field, nextValue) {
        setContent(current => ({ ...current, [field]: nextValue }));
    }

    return <div className="tags_directory_reviews_editor_backdrop" onMouseDown={onClose}>
        <section className="tags_directory_reviews_editor" onMouseDown={event => event.stopPropagation()}>
            <header>
                <div><small>TAGS REVIEWS</small><h3>{invitation ? "Invitación a reseñar" : "Slider de reseñas públicas"}</h3></div>
                <button type="button" onClick={onClose} aria-label="Cerrar"><FaXmark /></button>
            </header>
            <div className="tags_directory_reviews_editor_body">
                <label>Texto superior<input value={content.eyebrow || ""} onChange={event => update("eyebrow", event.target.value)} /></label>
                <label>Título<input value={content.title || ""} onChange={event => update("title", event.target.value)} /></label>
                <label className="is_wide">{invitation ? "Texto" : "Descripción"}<textarea value={(invitation ? content.text : content.description) || ""} onChange={event => update(invitation ? "text" : "description", event.target.value)} /></label>
                <label>Nombre en el menú<input value={content.menuLabel || ""} onChange={event => update("menuLabel", event.target.value)} placeholder={invitation ? "Dejar una reseña" : "Opiniones"} /></label>
                {invitation ? <><label>Texto del botón<input value={content.buttonLabel || ""} onChange={event => update("buttonLabel", event.target.value)} /></label><label className="is_check is_wide"><input type="checkbox" checked={content.disableGoogleThreshold === true} onChange={event => update("disableGoogleThreshold", event.target.checked)} /> Deshabilitar umbral para invitar a reseñar en Google</label><p className="is_note">Desmarcado —comportamiento predeterminado actual de Tags— el enlace de Google se muestra sólo cuando la calificación alcanza el umbral definido en Tags Reviews. Marcado, se muestra siempre que exista un enlace de Google configurado.</p></> : <>
                    <label>Cantidad máxima<select value={Number(content.limit || 10)} onChange={event => update("limit", Number(event.target.value))}><option value={6}>6 reseñas</option><option value={10}>10 reseñas</option><option value={15}>15 reseñas</option><option value={20}>20 reseñas</option></select></label>
                    <label className="is_check"><input type="checkbox" checked={content.showDate !== false} onChange={event => update("showDate", event.target.checked)} /> Mostrar fecha</label>
                    <label className="is_check"><input type="checkbox" checked={content.showVerified !== false} onChange={event => update("showVerified", event.target.checked)} /> Mostrar reseña verificada</label>
                </>}
                <p className="is_note">Los colores heredan el tema de Directorio. Si después se selecciona un tema propio desde Tags Reviews, estos bloques adoptan ese tema hasta que se vuelva a aplicar uno desde Directorio.</p>
            </div>
            <footer><button type="button" onClick={onClose}>Cancelar</button><button type="button" onClick={() => onSave(content)}>Guardar cambios</button></footer>
        </section>
    </div>;
}
