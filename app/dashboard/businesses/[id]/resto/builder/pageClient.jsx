"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowDown, FaArrowUp, FaEye, FaEyeSlash, FaPlus, FaTrash, FaWandMagicSparkles } from "react-icons/fa6";
import StoreBlockEditor from "@/app/modules/store/components/admin/builder/StoreBlockEditor";
import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/modules/resto/styles/resto-builder.css";

export default function RestoBuilderClient({ businessId, permissions = [] }) {
    const router = useRouter();
    const canManage = permissions.includes("*") || permissions.includes("builder.manage");
    const [data, setData] = useState({ sections: [], blocks: [], modules: [], hasReviews: false });
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [themes, setThemes] = useState([]);
    const [themeSaving, setThemeSaving] = useState(false);
    const [pendingThemeId, setPendingThemeId] = useState(undefined);

    async function load() {
        setLoading(true);
        const response = await fetch(`/api/resto/admin/builder/get?businessId=${businessId}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) setMessage(payload.error || "No se pudo cargar el Builder");
        else setData(payload);
        setLoading(false);
    }
    useEffect(() => { load(); }, [businessId]);
    useEffect(() => {
        fetch("/api/qr-page/themes/list", { cache: "no-store" })
            .then(response => response.json())
            .then(payload => setThemes(payload.themes || []))
            .catch(() => setThemes([]));
    }, []);
    const blocksBySection = useMemo(() => data.blocks.reduce((result, block) => { (result[block.section_id] ||= []).push(block); return result; }, {}), [data.blocks]);

    async function call(path, body) {
        setSaving(true); setMessage("");
        const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, ...body }) });
        const payload = await response.json();
        setSaving(false);
        if (!response.ok) throw new Error(payload.error || "No se pudo guardar");
        await load();
    }
    async function addSection() { try { await call("/api/resto/admin/builder/sections/create", { section_type: "content", title: "Nueva sección" }); } catch (error) { setMessage(error.message); } }
    async function addBlock(sectionId, type) { if (!type) return; const module = data.modules.find(item => item.type === type); try { await call("/api/resto/admin/builder/blocks/create", { sectionId, block_type: type, title: module?.label, content_json: module?.defaultContent || {}, styles_json: module?.defaultStyles || {}, animation_json: module?.defaultAnimation || {} }); } catch (error) { setMessage(error.message); } }
    async function removeSection(sectionId) { if (!window.confirm("¿Eliminar esta sección y sus bloques?")) return; try { await call("/api/resto/admin/builder/sections/delete", { sectionId }); } catch (error) { setMessage(error.message); } }
    async function removeBlock(block) { if (!window.confirm("¿Eliminar este bloque?")) return; try { await call("/api/resto/admin/builder/blocks/delete", { sectionId: block.section_id, blockId: block.id }); } catch (error) { setMessage(error.message); } }
    async function toggleSection(section) { try { await call("/api/resto/admin/builder/sections/update", { sectionId: section.id, section_type: section.section_type, title: section.title, settings_json: section.settings_json || {}, is_visible: !Number(section.is_visible) }); } catch (error) { setMessage(error.message); } }
    async function toggleBlock(block) { try { await call("/api/resto/admin/builder/blocks/update", { sectionId: block.section_id, blockId: block.id, block_type: block.block_type, title: block.title, content_json: block.content_json || {}, styles_json: block.styles_json || {}, animation_json: block.animation_json || {}, is_visible: !Number(block.is_visible) }); } catch (error) { setMessage(error.message); } }
    async function moveSection(index, direction) { const ids = [...data.sections].sort((a, b) => Number(a.sort_order) - Number(b.sort_order)).map(item => item.id); const target = index + direction; if (target < 0 || target >= ids.length) return; [ids[index], ids[target]] = [ids[target], ids[index]]; try { await call("/api/resto/admin/builder/sections/reorder", { sectionIds: ids }); } catch (error) { setMessage(error.message); } }
    async function moveBlock(sectionId, index, direction) { const ids = (blocksBySection[sectionId] || []).map(item => item.id); const target = index + direction; if (target < 0 || target >= ids.length) return; [ids[index], ids[target]] = [ids[target], ids[index]]; try { await call("/api/resto/admin/builder/blocks/reorder", { sectionId, blockIds: ids }); } catch (error) { setMessage(error.message); } }
    async function applyTheme(themeId) {
        if (!canManage || !data.store?.page_id) return;
        setThemeSaving(true); setMessage("");
        try {
            const endpoint = themeId ? "/api/qr-page/themes/apply" : "/api/qr-page/themes/reset";
            const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, pageId: data.store.page_id, ...(themeId ? { themeId } : {}) }) });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "No se pudo aplicar el tema");
            setData(prev => ({ ...prev, store: { ...prev.store, theme_id: themeId || null, theme: themeId ? themes.find(theme => Number(theme.id) === Number(themeId)) || prev.store.theme : null } }));
            setPendingThemeId(undefined);
        } catch (error) { setMessage(error.message); }
        finally { setThemeSaving(false); }
    }
    if (loading) return <main className="resto_builder_page"><p>Cargando Builder de Resto…</p></main>;
    const sections = [...data.sections].sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
    return <main className="resto_builder_page">
        <div className="resto_builder_header"><div><button className="resto_builder_back" type="button" onClick={() => router.push(`/dashboard/businesses/${businessId}/resto`)}>← Volver al dashboard Resto</button><h1>Diseño de la página pública</h1><p>Organizá las secciones y personalizá el contenido visible para tus clientes.</p></div>{canManage && <button className="resto_builder_primary" type="button" onClick={addSection}><FaPlus /> Agregar sección</button>}</div>
        <div className="resto_builder_legend"><span><FaArrowUp /> / <FaArrowDown /> Ordenar</span><span><FaEye /> Visibilidad</span><span><FaWandMagicSparkles /> Editar contenido y estilos</span><span><FaTrash /> Eliminar</span></div>
        {message && <div className="resto_builder_notice" role="alert">{message}</div>}
        {!canManage && <div className="resto_builder_notice info">Tenés acceso de lectura. Se requiere <b>builder.manage</b> para editar.</div>}
        {!data.hasReviews && <div className="resto_builder_notice info">Tags Reviews no está asignado. Sus bloques permanecen guardados, pero no se muestran ni se pueden agregar.</div>}
        <section className="resto_builder_theme_panel">
            <div><h2>Tema visual</h2><p>Elegí un tema propio para la página del Resto o heredá el tema configurado en Portal.</p></div>
            <div className="resto_builder_theme_grid">
                <button type="button" className={`resto_builder_theme_card ${((pendingThemeId === null) || (pendingThemeId === undefined && !data.store?.theme_id)) ? "active" : ""}`} disabled={!canManage || themeSaving} onClick={() => setPendingThemeId(null)}><span className="resto_builder_theme_swatch portal" /><strong>Heredar de Portal</strong><small>{!data.store?.theme_id && pendingThemeId === undefined ? "Activo" : "Seleccionar"}</small></button>
                {themes.map(theme => <button type="button" key={theme.id} className={`resto_builder_theme_card ${Number(pendingThemeId ?? data.store?.theme_id) === Number(theme.id) ? "active" : ""}`} disabled={!canManage || themeSaving} onClick={() => setPendingThemeId(theme.id)}><span className="resto_builder_theme_swatch" style={{ background: theme.css_tokens?.["--qr-primary"] || "#16a34a" }} /><strong>{theme.name || theme.code}</strong><small>{Number(data.store?.theme_id) === Number(theme.id) && pendingThemeId === undefined ? "Activo" : "Seleccionar"}</small></button>)}
            </div>
            {canManage && pendingThemeId !== undefined && <div className="resto_builder_theme_actions"><button type="button" className="resto_builder_action" disabled={themeSaving} onClick={() => setPendingThemeId(undefined)}>Cancelar</button><button type="button" className="resto_builder_primary" disabled={themeSaving} onClick={() => applyTheme(pendingThemeId)}>{themeSaving ? "Guardando..." : "Guardar tema"}</button></div>}
        </section>
        {sections.map((section, sectionIndex) => <section className={`resto_builder_section ${Number(section.is_visible) ? "" : "is-hidden"}`} key={section.id}>
            <header className="resto_builder_section_header"><strong className="resto_builder_section_title">{section.title || section.section_type}</strong><small className="resto_builder_type">Sección: {section.section_type}</small>{canManage && <div className="resto_builder_actions"><button className="resto_builder_action" type="button" title="Mover sección hacia arriba" onClick={() => moveSection(sectionIndex, -1)}><FaArrowUp /><span>Subir</span></button><button className="resto_builder_action" type="button" title="Mover sección hacia abajo" onClick={() => moveSection(sectionIndex, 1)}><FaArrowDown /><span>Bajar</span></button><button className="resto_builder_action" type="button" title={Number(section.is_visible) ? "Ocultar sección" : "Mostrar sección"} onClick={() => toggleSection(section)}>{Number(section.is_visible) ? <FaEye /> : <FaEyeSlash />}<span>{Number(section.is_visible) ? "Ocultar" : "Mostrar"}</span></button><button className="resto_builder_action danger" type="button" title="Eliminar sección y sus bloques" onClick={() => removeSection(section.id)}><FaTrash /><span>Eliminar</span></button></div>}</header>
            <div className="resto_builder_blocks">{(blocksBySection[section.id] || []).map((block, blockIndex) => <div className={`resto_builder_block ${Number(block.is_visible) ? "" : "is-hidden"}`} key={block.id}><span className="resto_builder_block_name"><strong>{block.title || block.block_type}</strong><small>{block.block_type}</small></span>{canManage && <div className="resto_builder_actions"><button className="resto_builder_action" type="button" title="Mover bloque hacia arriba" onClick={() => moveBlock(section.id, blockIndex, -1)}><FaArrowUp /><span>Subir</span></button><button className="resto_builder_action" type="button" title="Mover bloque hacia abajo" onClick={() => moveBlock(section.id, blockIndex, 1)}><FaArrowDown /><span>Bajar</span></button><button className="resto_builder_action" type="button" title={Number(block.is_visible) ? "Ocultar bloque" : "Mostrar bloque"} onClick={() => toggleBlock(block)}>{Number(block.is_visible) ? <FaEye /> : <FaEyeSlash />}<span>{Number(block.is_visible) ? "Ocultar" : "Mostrar"}</span></button><button className="resto_builder_action" type="button" title="Editar contenido, colores y estilos" onClick={() => setSelected(block)}><FaWandMagicSparkles /><span>Editar</span></button><button className="resto_builder_action danger" type="button" title="Eliminar bloque" onClick={() => removeBlock(block)}><FaTrash /><span>Eliminar</span></button></div>}</div>)}</div>
            {canManage && <select className="resto_builder_add" defaultValue="" onChange={event => { addBlock(section.id, event.target.value); event.target.value = ""; }}><option value="">+ Agregar bloque a esta sección…</option>{data.modules.map(module => <option key={module.type} value={module.type}>{module.label}</option>)}</select>}
        </section>)}
        {selected && <StoreBlockEditor businessId={businessId} entity={{ name: data.store?.name || "Restaurante", description: data.store?.description || "" }} section={sections.find(section => Number(section.id) === Number(selected.section_id))} block={selected} moduleDefinition={data.modules.find(module => module.type === selected.block_type)} updateEndpoint="/api/resto/admin/builder/blocks/update" onClose={() => setSelected(null)} onBlockUpdated={(updated) => { setData(prev => ({ ...prev, blocks: prev.blocks.map(item => Number(item.id) === Number(updated.id) ? { ...item, ...updated } : item) })); setSelected(null); }} />}
        {saving && <p>Guardando cambios…</p>}
    </main>;
}
