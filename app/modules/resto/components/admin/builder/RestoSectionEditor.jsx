"use client";

import { useState } from "react";
import "@/app/modules/resto/styles/resto-builder-section-editor.css";

const spacingOptions = [
    ["none", "Sin espacio"],
    ["small", "Pequeño"],
    ["normal", "Normal"],
    ["large", "Grande"],
    ["xl", "Muy grande"]
];

export default function RestoSectionEditor({ section, onClose, onSaved }) {
    const settings = section.settings_json || {};
    const [title, setTitle] = useState(section.title || "");
    const [isVisible, setIsVisible] = useState(Boolean(Number(section.is_visible)));
    const [values, setValues] = useState({
        container: settings.container || "normal",
        alignment: settings.alignment || "left",
        backgroundColor: settings.backgroundColor || "",
        textColor: settings.textColor || "",
        paddingTop: settings.paddingTop || "normal",
        paddingBottom: settings.paddingBottom || "normal",
        borderRadius: settings.borderRadius || "none"
    });
    const [saving, setSaving] = useState(false);
    const update = (key, value) => setValues(current => ({ ...current, [key]: value }));

    async function save() {
        setSaving(true);
        try {
            const response = await fetch("/api/resto/admin/builder/sections/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sectionId: section.id,
                    section_type: section.section_type,
                    title,
                    is_visible: isVisible,
                    settings_json: values
                })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "No se pudo guardar la sección");
            onSaved?.({ ...section, title, is_visible: isVisible, settings_json: values });
            onClose();
        } catch (error) {
            window.alert(error.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="resto_builder_section_editor_overlay" role="presentation">
            <section className="resto_builder_section_editor" role="dialog" aria-modal="true">
                <header>
                    <div>
                        <h2>Editar sección</h2>
                        <p>Definí el espacio y la presentación de esta sección.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
                </header>
                <div className="resto_builder_section_editor_body">
                    <label><span>Título interno</span><input value={title} onChange={event => setTitle(event.target.value)} /></label>
                    <label><span>Visibilidad</span><select value={isVisible ? "visible" : "hidden"} onChange={event => setIsVisible(event.target.value === "visible")}><option value="visible">Visible</option><option value="hidden">Oculta</option></select></label>
                    <label><span>Ancho del contenido</span><select value={values.container} onChange={event => update("container", event.target.value)}><option value="normal">Normal</option><option value="wide">Ancho</option><option value="full">Pantalla completa</option></select></label>
                    <label><span>Alineación</span><select value={values.alignment} onChange={event => update("alignment", event.target.value)}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></label>
                    <label><span>Color de fondo</span><input type="color" value={values.backgroundColor || "#ffffff"} onChange={event => update("backgroundColor", event.target.value)} /></label>
                    <label><span>Color de texto</span><input type="color" value={values.textColor || "#172033"} onChange={event => update("textColor", event.target.value)} /></label>
                    <label><span>Espacio superior</span><select value={values.paddingTop} onChange={event => update("paddingTop", event.target.value)}>{spacingOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label><span>Espacio inferior</span><select value={values.paddingBottom} onChange={event => update("paddingBottom", event.target.value)}>{spacingOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label><span>Redondeo</span><select value={values.borderRadius} onChange={event => update("borderRadius", event.target.value)}><option value="none">Sin redondeo</option><option value="small">Pequeño</option><option value="normal">Normal</option><option value="large">Grande</option><option value="pill">Muy redondeado</option></select></label>
                </div>
                <footer><button type="button" onClick={onClose}>Cancelar</button><button type="button" className="primary" disabled={saving} onClick={save}>{saving ? "Guardando..." : "Guardar sección"}</button></footer>
            </section>
        </div>
    );
}
