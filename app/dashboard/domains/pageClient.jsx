"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import showAlert from "@/app/components/showAlert";
import { themeColor } from "@/app/modules/domains/lib/domainUtils";
import "./domains.css";
import "../../styles/tagsModals.css";

const empty = { business_id: "", domain: "", theme_id: "", favicon_url: "", logo_url: "", site_name: "", is_active: true };
const asBool = value => Number(value) === 1 || value === true;

export default function DomainsPageClient() {
    const [domains, setDomains] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [themes, setThemes] = useState([]);
    const [search, setSearch] = useState("");
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [businessSearch, setBusinessSearch] = useState("");
    const [businessPickerOpen, setBusinessPickerOpen] = useState(false);

    async function load() {
        setLoading(true);
        const [d, b, t] = await Promise.all([
            fetch("/api/domains/list", { cache: "no-store" }).then(r => r.json()).catch(() => []),
            fetch("/api/business/list", { cache: "no-store" }).then(r => r.json()).catch(() => []),
            fetch("/api/qr-page/themes/list", { cache: "no-store" }).then(r => r.json()).catch(() => ({}))
        ]);
        setDomains(Array.isArray(d) ? d : []);
        setBusinesses(Array.isArray(b) ? [...b].sort((left, right) => String(left.name || left.email || "").localeCompare(String(right.name || right.email || ""), "es", { sensitivity: "base" })) : []);
        setThemes(Array.isArray(t?.themes) ? t.themes : []);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);
    const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
    const openCreate = () => { setForm({ ...empty, business_id: "", theme_id: themes[0]?.id || "" }); setBusinessSearch(""); setBusinessPickerOpen(false); setEditing("create"); };
    const openEdit = domain => { setForm({ ...domain, business_id: domain.business_id, theme_id: domain.theme_id || themes[0]?.id || "", is_active: asBool(domain.is_active) }); setBusinessSearch(`${domain.business_name || "Cliente"} — ${domain.business_email || "sin email"}`); setBusinessPickerOpen(false); setEditing(domain.id); };
    const close = () => { setEditing(null); setForm(empty); setBusinessSearch(""); setBusinessPickerOpen(false); };

    async function save() {
        const endpoint = editing === "create" ? "/api/domains/create" : "/api/domains/update";
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return showAlert({ title: "Error", text: data.error || "No se pudo guardar el dominio", icon: "error" });
        await showAlert({ title: "OK", text: editing === "create" ? "Dominio creado correctamente" : "Dominio actualizado correctamente", icon: "success" });
        close();
        load();
    }

    async function disable(id) {
        if (!await showAlert({ title: "¿Desactivar dominio?", text: "También se desactivarán sus rutas públicas.", icon: "warning", showCancelButton: true, confirmButtonText: "Desactivar", cancelButtonText: "Cancelar" })) return;
        const response = await fetch(`/api/domains/delete?id=${id}`, { method: "DELETE" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return showAlert({ title: "Error", text: data.error || "No se pudo desactivar", icon: "error" });
        load();
    }

    const filtered = domains.filter(item => [item.domain, item.business_name, item.business_email, item.theme_name].join(" ").toLowerCase().includes(search.toLowerCase()));
    const selectedTheme = themes.find(t => Number(t.id) === Number(form.theme_id));
    const filteredBusinesses = useMemo(() => {
        const term = businessSearch.trim().toLocaleLowerCase("es");
        if (!term) return businesses.slice(0, 80);
        return businesses.filter(item => `${item.name || ""} ${item.email || ""} ${item.id}`.toLocaleLowerCase("es").includes(term)).slice(0, 80);
    }, [businessSearch, businesses]);
    const chooseBusiness = business => {
        update("business_id", business.id);
        setBusinessSearch(`${business.name || "Cliente"} — ${business.email || "sin email"}`);
        setBusinessPickerOpen(false);
    };

    return <main className="domains_page container-fluid m-0 p-3">
        <div className="domains_toolbar">
            <div><h1 className="tags_title">Dominios</h1><p>Gestioná dominios, subdominios y sus aplicaciones públicas.</p></div>
            <div className="domains_toolbar_actions"><input className="form-control tags_text_normal" placeholder="Buscar dominio o cliente..." value={search} onChange={e => setSearch(e.target.value)} /><button className="tags_btn rounded" onClick={openCreate}>✚ Nuevo</button></div>
        </div>
        <div className="tags_table_wrapper"><table className="tags_table tags_text_normal"><thead><tr><th>Dominio</th><th>Cliente</th><th>Tema</th><th className="text-center">Rutas</th><th className="text-center">Estado</th><th className="text-center">Acciones</th></tr></thead><tbody>
            {loading ? <tr><td colSpan="6" className="domains_empty">Cargando dominios...</td></tr> : filtered.length ? filtered.map(item => <tr key={item.id}><td className="bold">{item.domain}</td><td>{item.business_name || "-"}<small>{item.business_email}</small></td><td>{item.theme_name || item.theme_code || "-"}</td><td className="text-center">{item.route_count || 0}</td><td className="text-center"><span className={`badge ${asBool(item.is_active) ? "active" : "inactive"}`}>{asBool(item.is_active) ? "Activo" : "Inactivo"}</span></td><td><div className="tags_actions domains_actions"><Link className="icon_btn" title="Ver rutas" href={`/dashboard/domains/${item.id}/routes`}>↗</Link><button className="icon_btn" title="Editar" onClick={() => openEdit(item)}>✏️</button><button className="icon_btn danger" title="Desactivar" onClick={() => disable(item.id)}>🗑</button></div></td></tr>) : <tr><td colSpan="6" className="domains_empty">No hay dominios para mostrar.</td></tr>}
        </tbody></table></div>
        {editing && <div className="tags_modal_overlay"><div className="tags_modal_card tags_modal_large"><button className="tags_modal_close" onClick={close}>✕</button><div className="tags_modal_header text-center"><h2 className="tags_modal_title tags_title">{editing === "create" ? "Nuevo dominio" : "Editar dominio"}</h2><p className="tags_modal_description">El tema debe pertenecer al catálogo activo de Tags.</p></div><div className="tags_modal_body"><div className="tags_modal_form_grid">
            <div className="tags_modal_group domains_business_picker"><label className="tags_modal_label">Cliente</label><input className="tags_modal_input" role="combobox" aria-expanded={businessPickerOpen} aria-controls="domains-business-results" autoComplete="off" value={businessSearch} placeholder="Buscar por nombre, email o ID..." onFocus={() => setBusinessPickerOpen(true)} onChange={event => { setBusinessSearch(event.target.value); update("business_id", ""); setBusinessPickerOpen(true); }} />{businessPickerOpen && <div id="domains-business-results" className="domains_business_results" role="listbox">{filteredBusinesses.length ? filteredBusinesses.map(business => <button type="button" role="option" aria-selected={Number(form.business_id) === Number(business.id)} key={business.id} onClick={() => chooseBusiness(business)}><strong>{business.name || "Cliente sin nombre"}</strong><span>{business.email || "Sin email"}</span><small>ID {business.id}</small></button>) : <p>No se encontraron clientes.</p>}</div>}{form.business_id && <small className="domains_business_selected">Cliente seleccionado · ID {form.business_id}</small>}</div>
            <div className="tags_modal_group"><label className="tags_modal_label">Dominio o subdominio</label><input className="tags_modal_input" value={form.domain || ""} placeholder="empresa.com.ar" onChange={e => update("domain", e.target.value)} /></div>
            <div className="tags_modal_group tags_modal_form_full"><label className="tags_modal_label">Tema</label><div className="domains_theme_options">{themes.map(theme => <button type="button" key={theme.id} className={`domains_theme_option ${Number(form.theme_id) === Number(theme.id) ? "selected" : ""}`} onClick={() => update("theme_id", theme.id)}><span style={{ background: themeColor(theme) || "#355e5a" }} /><strong>{theme.name || theme.code}</strong><small>{theme.code}</small></button>)}</div>{selectedTheme && <small className="domains_theme_hint">Tema seleccionado: {selectedTheme.name}</small>}</div>
            <div className="tags_modal_group"><label className="tags_modal_label">Nombre del sitio</label><input className="tags_modal_input" value={form.site_name || ""} onChange={e => update("site_name", e.target.value)} /></div><div className="tags_modal_group"><label className="tags_modal_label">Logo URL</label><input className="tags_modal_input" value={form.logo_url || ""} onChange={e => update("logo_url", e.target.value)} /></div><div className="tags_modal_group"><label className="tags_modal_label">Favicon URL</label><input className="tags_modal_input" value={form.favicon_url || ""} onChange={e => update("favicon_url", e.target.value)} /></div><div className="tags_modal_group"><label className="tags_modal_label">Estado</label><label className="domains_checkbox"><input type="checkbox" checked={!!form.is_active} onChange={e => update("is_active", e.target.checked)} /> Activo</label></div>
        </div></div><div className="tags_modal_actions"><button className="tags_modal_btn tags_modal_btn_success" onClick={save}>💾 Guardar</button><button className="tags_modal_btn tags_modal_btn_cancel" onClick={close}>✖ Cancelar</button></div></div></div>}
    </main>;
}
