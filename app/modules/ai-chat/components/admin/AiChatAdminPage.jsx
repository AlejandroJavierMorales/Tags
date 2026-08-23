"use client";

import { useEffect, useState } from "react";
import { FaArrowLeft, FaPen, FaPlus, FaRobot, FaTrash } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import showAlert from "@/app/components/showAlert";
import AiChatUsagePanel from "./AiChatUsagePanel";
import "./AiChatAdminPage.css";

const EMPTY = {
    is_enabled: 1,
    title: "Asistente de Tags",
    subtitle: "Te ayudamos a conocer nuestras soluciones",
    greeting: "Hola, soy el asistente. ¿En qué podemos ayudarte?",
    position: "right",
    primary_color: "#1f9d55",
    launcher_color: "#1f9d55",
    launcher_offset_bottom: 120
};

export default function AiChatAdminPage({ businessId }) {
    const router = useRouter();
    const [form, setForm] = useState(EMPTY);
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [documentForm, setDocumentForm] = useState({ title: "", topics: "", content: "", is_active: true, sort_order: 0 });
    const [editingDocument, setEditingDocument] = useState(null);

    useEffect(() => {
        fetch(`/api/ai/admin/settings?businessId=${encodeURIComponent(businessId)}`, { cache: "no-store" })
            .then(async response => ({ response, payload: await response.json().catch(() => ({})) }))
            .then(({ response, payload }) => {
                if (!response.ok || !payload.ok) throw new Error(payload.error || "No se pudo cargar la configuración");
                setBusiness(payload.business);
                setForm({ ...EMPTY, ...payload.settings });
            })
            .catch(error => showAlert({ title: "No se pudo cargar", text: error.message, icon: "error" }))
            .finally(() => setLoading(false));
    }, [businessId]);

    async function loadDocuments() {
        const response = await fetch(`/api/ai/admin/knowledge?businessId=${encodeURIComponent(businessId)}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) throw new Error(payload.error || "No se pudo cargar la base de conocimiento");
        setDocuments(payload.documents || []);
    }

    useEffect(() => { loadDocuments().catch(error => showAlert({ title: "No se pudo cargar la base de conocimiento", text: error.message, icon: "error" })); }, [businessId]);

    function update(key, value) {
        setForm(current => ({ ...current, [key]: value }));
    }

    async function save(event) {
        event.preventDefault();
        setSaving(true);
        try {
            const response = await fetch("/api/ai/admin/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId, ...form })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload.ok) return showAlert({ title: "No se pudo guardar", text: payload.error || "Revisá los datos e intentá nuevamente.", icon: "error" });
            setForm(current => ({ ...current, ...payload.settings }));
            await showAlert({ title: "Configuración guardada", text: "La configuración general del chatbot fue actualizada.", icon: "success", timer: 1600 });
        } finally {
            setSaving(false);
        }
    }

    function editDocument(document) {
        setEditingDocument(document.id);
        setDocumentForm({ title: document.title || "", topics: document.topics || "", content: document.content || "", is_active: !!Number(document.is_active), sort_order: document.sort_order || 0 });
    }

    function resetDocument() { setEditingDocument(null); setDocumentForm({ title: "", topics: "", content: "", is_active: true, sort_order: 0 }); }

    async function saveDocument(event) {
        event.preventDefault();
        const response = await fetch("/api/ai/admin/knowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, ...documentForm, id: editingDocument, slug: documentForm.title }) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) return showAlert({ title: "No se pudo guardar", text: payload.error || "Revisá el documento", icon: "error" });
        await loadDocuments(); resetDocument();
        await showAlert({ title: "Documento guardado", text: "El chatbot podrá utilizar esta información.", icon: "success", timer: 1400 });
    }

    async function deleteDocument(id) {
        const response = await fetch("/api/ai/admin/knowledge", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, id }) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) return showAlert({ title: "No se pudo eliminar", text: payload.error || "Intentá nuevamente", icon: "error" });
        await loadDocuments();
    }

    return (
        <main className="tags_ai_chat_admin">
            <header className="tags_ai_chat_admin_hero">
                <div className="tags_ai_chat_admin_identity">
                    <span className="tags_ai_chat_admin_icon"><FaRobot /></span>
                    <div><small>HERRAMIENTA CONTRATADA</small><h1>Chatbot con IA</h1><p>Configuración para {business?.display_name || business?.name || "el negocio"}.</p></div>
                </div>
                <button type="button" onClick={() => router.push(`/dashboard/businesses/${businessId}`)}><FaArrowLeft /> Volver al negocio</button>
            </header>

            {loading ? <section className="tags_ai_chat_admin_panel"><p>Cargando configuración...</p></section> : <form onSubmit={save} className="tags_ai_chat_admin_panel">
                <div className="tags_ai_chat_admin_switch">
                    <input id="ai-chat-enabled" type="checkbox" checked={!!Number(form.is_enabled)} onChange={event => update("is_enabled", event.target.checked ? 1 : 0)} />
                    <label htmlFor="ai-chat-enabled"><strong>Asistente habilitado</strong><small>La página pública podrá mostrarlo cuando se active desde su propia configuración.</small></label>
                </div>

                <div className="tags_ai_chat_admin_grid">
                    <label>Color del encabezado<div className="tags_ai_color_control"><input type="color" value={form.primary_color} onChange={event => update("primary_color", event.target.value)} /><input type="text" value={form.primary_color} maxLength={7} pattern="^#[0-9a-fA-F]{6}$" onChange={event => update("primary_color", event.target.value)} placeholder="#1f9d55" /></div><small>Podés pegar directamente un color hexadecimal.</small></label>
                    <label>Color de la burbuja<div className="tags_ai_color_control"><input type="color" value={form.launcher_color} onChange={event => update("launcher_color", event.target.value)} /><input type="text" value={form.launcher_color} maxLength={7} pattern="^#[0-9a-fA-F]{6}$" onChange={event => update("launcher_color", event.target.value)} placeholder="#1f9d55" /></div><small>Ejemplo: #1f9d55</small></label>
                    <label>Altura de la burbuja (px)<input type="number" min="0" max="400" value={form.launcher_offset_bottom} onChange={event => update("launcher_offset_bottom", event.target.value)} /><small>Distancia desde el borde inferior.</small></label>
                    <label>Título<input id="ai-chat-title" value={form.title} maxLength={120} onChange={event => update("title", event.target.value)} /></label>
                    <label>Texto debajo del título<input id="ai-chat-subtitle" value={form.subtitle} maxLength={180} onChange={event => update("subtitle", event.target.value)} /></label>
                    <label className="is_wide">Saludo inicial<textarea id="ai-chat-greeting" rows="3" maxLength={500} value={form.greeting} onChange={event => update("greeting", event.target.value)} /></label>
                    <label>Ubicación<select id="ai-chat-position" value={form.position} onChange={event => update("position", event.target.value)}><option value="right">Abajo a la derecha</option><option value="left">Abajo a la izquierda</option></select></label>
                </div>

                <footer><button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar configuración"}</button></footer>
            </form>}

            {!loading && <AiChatUsagePanel businessId={businessId} />}

            {!loading && <section className="tags_ai_chat_admin_panel tags_ai_chat_knowledge_panel">
                <div className="tags_ai_chat_admin_panel_title"><div><h2>Base de conocimiento propia</h2><p>Agregá información específica del negocio para que el asistente responda con mayor precisión.</p></div><button type="button" onClick={resetDocument}><FaPlus /> Nuevo contenido</button></div>
                <form onSubmit={saveDocument} className="tags_ai_chat_knowledge_form">
                    <label>Título<input required value={documentForm.title} onChange={event => setDocumentForm(current => ({ ...current, title: event.target.value }))} placeholder="Ej.: Servicios y horarios" /></label>
                    <label>Temas relacionados<input value={documentForm.topics} onChange={event => setDocumentForm(current => ({ ...current, topics: event.target.value }))} placeholder="separados por comas" /></label>
                    <label className="is_wide">Contenido<textarea required rows="7" value={documentForm.content} onChange={event => setDocumentForm(current => ({ ...current, content: event.target.value }))} placeholder="Información que el chatbot puede comunicar..." /></label>
                    <label className="tags_ai_knowledge_check"><input type="checkbox" checked={documentForm.is_active} onChange={event => setDocumentForm(current => ({ ...current, is_active: event.target.checked }))} /> Usar este contenido en las respuestas</label>
                    <footer><button type="button" onClick={resetDocument}>Cancelar</button><button type="submit">{editingDocument ? "Guardar cambios" : "Agregar contenido"}</button></footer>
                </form>
                <div className="tags_ai_knowledge_list">{documents.length ? documents.map(document => <article key={document.id}><div><strong>{document.title}</strong><small>{Number(document.is_active) ? "Activo" : "Desactivado"}{document.topics ? ` · ${document.topics}` : ""}</small></div><div><button type="button" title="Editar" onClick={() => editDocument(document)}><FaPen /></button><button type="button" title="Eliminar" onClick={() => deleteDocument(document.id)}><FaTrash /></button></div></article>) : <p>No hay contenidos propios cargados.</p>}</div>
            </section>}
        </main>
    );
}
