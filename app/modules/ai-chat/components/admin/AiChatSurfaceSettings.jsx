"use client";

import { useEffect, useState } from "react";
import { FaRobot } from "react-icons/fa6";
import showAlert from "@/app/components/showAlert";
import "./AiChatSurfaceSettings.css";

const EMPTY = { is_enabled: 0, widget_type: "bubble", position: "right", primary_color: "#1f9d55", launcher_color: "#1f9d55", launcher_label: "Chat", launcher_offset_bottom: 100 };

export default function AiChatSurfaceSettings({ businessId, surfaceType, surfaceId, surfaceLabel = "esta página" }) {
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [unavailable, setUnavailable] = useState("");

    useEffect(() => {
        if (!surfaceId) return;
        fetch(`/api/ai/admin/surface?businessId=${businessId}&surfaceType=${surfaceType}&surfaceId=${surfaceId}`, { cache: "no-store" })
            .then(async response => ({ response, payload: await response.json().catch(() => ({})) }))
            .then(({ response, payload }) => {
                if (!response.ok || !payload.ok) throw new Error(payload.error || "No se pudo cargar la configuración");
                setForm({ ...EMPTY, ...payload.settings });
            })
            .catch(error => setUnavailable(error.message))
            .finally(() => setLoading(false));
    }, [businessId, surfaceType, surfaceId]);

    function update(key, value) { setForm(current => ({ ...current, [key]: value })); }

    async function save(event) {
        event.preventDefault();
        setSaving(true);
        try {
            const response = await fetch("/api/ai/admin/surface", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, surfaceType, surfaceId, ...form }) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload.ok) throw new Error(payload.error || "No se pudo guardar la configuración");
            setForm({ ...EMPTY, ...payload.settings });
            await showAlert({ title: "Configuración guardada", text: `El chatbot quedó configurado para ${surfaceLabel}.`, icon: "success", timer: 1500 });
        } catch (error) { await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" }); }
        finally { setSaving(false); }
    }

    if (loading) return <section className="tags_ai_surface_panel"><p>Cargando configuración del chatbot...</p></section>;
    if (unavailable) return <section className="tags_ai_surface_panel tags_ai_surface_unavailable"><FaRobot /><div><h2>Chatbot con IA</h2><p>{unavailable}</p><small>Primero debe estar contratada la herramienta Chatbot con IA para este negocio.</small></div></section>;
    return <form className="tags_ai_surface_panel" onSubmit={save}>
        <div className="tags_ai_surface_heading"><span className="tags_ai_surface_icon"><FaRobot /></span><div><h2>Chatbot con IA</h2><p>Definí si se muestra en {surfaceLabel} y cómo se presenta a los visitantes.</p></div></div>
        <label className="tags_ai_surface_switch"><input type="checkbox" checked={!!Number(form.is_enabled)} onChange={event => update("is_enabled", event.target.checked ? 1 : 0)} /><span><strong>Mostrar chatbot en esta página</strong><small>La configuración general y la base de conocimiento se administran desde Chatbot con IA.</small></span></label>
        <div className="tags_ai_surface_grid">
            <label>Tipo de burbuja<select value={form.widget_type} onChange={event => update("widget_type", event.target.value)}><option value="bubble">Burbuja de chat</option><option value="robot">Burbuja con robot</option></select></label>
            <label>Ubicación<select value={form.position} onChange={event => update("position", event.target.value)}><option value="right">Abajo a la derecha</option><option value="left">Abajo a la izquierda</option></select></label>
            <label>Color principal<input type="color" value={form.primary_color} onChange={event => update("primary_color", event.target.value)} /></label>
            <label>Color de la burbuja<input type="color" value={form.launcher_color} onChange={event => update("launcher_color", event.target.value)} /></label>
            <label>Altura de la burbuja (px)<input type="number" min="0" max="400" step="5" value={form.launcher_offset_bottom} onChange={event => update("launcher_offset_bottom", event.target.value)} /><small>Distancia respecto del borde inferior.</small></label>
        </div>
        <footer><button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar configuración"}</button></footer>
    </form>;
}
