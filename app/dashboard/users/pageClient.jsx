"use client";

import { useEffect, useState } from "react";
import showAlert from "@/app/components/showAlert";
import "@/app/styles/tags_dashboard.css";

function date(value) { return value ? new Date(value).toLocaleString("es-AR") : "-"; }

export default function UsersAdminPageClient() {
    const [users, setUsers] = useState([]);
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        const response = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "No se pudieron cargar los usuarios");
        setUsers(payload.users || []);
        setLoading(false);
    }

    async function openUser(id) {
        const response = await fetch(`/api/admin/users?id=${id}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return showAlert({ title: "No se pudo cargar el detalle", text: payload.error, icon: "error" });
        setSelected(payload.user);
        setDetail(payload);
    }

    async function save(event) {
        event.preventDefault();
        const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selected) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return showAlert({ title: "No se pudo guardar", text: payload.error, icon: "error" });
        await showAlert({ title: "Usuario actualizado", icon: "success", timer: 1200 });
        await load();
        await openUser(selected.id);
    }

    async function deactivate() {
        const confirmation = await showAlert({ title: "¿Desactivar usuario?", text: "No se borrarán sus movimientos ni historial. Se impedirá su acceso personal.", icon: "warning", showCancelButton: true, confirmButtonText: "Desactivar", cancelButtonText: "Cancelar" });
        if (!confirmation?.isConfirmed) return;
        const response = await fetch(`/api/admin/users?id=${selected.id}`, { method: "DELETE" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return showAlert({ title: "No se pudo desactivar", text: payload.error, icon: "error" });
        await showAlert({ title: "Usuario desactivado", icon: "success", timer: 1200 });
        await load();
        await openUser(selected.id);
    }

    useEffect(() => { load().catch(error => showAlert({ title: "No se pudo cargar Usuarios", text: error.message, icon: "error" })); }, []);

    return <main className="tags_dashboard_page container-fluid p-3">
        <div className="tags_dashboard_hero"><div><span className="tags_dashboard_kicker">ADMINISTRACIÓN DE PLATAFORMA</span><h1 className="tags_dashboard_title">Usuarios</h1><p className="tags_dashboard_subtitle">Cuentas personales, accesos y movimientos históricos.</p></div></div>
        <section className="tags_dashboard_table_card mt-3 p-3"><div className="d-flex gap-2 align-items-center mb-3"><input className="form-control" placeholder="Buscar por nombre, email o documento" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} /><button type="button" className="btn btn-success" onClick={load}>Buscar</button></div>
            <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Usuario</th><th>Contacto</th><th>Estado</th><th>Directorios</th><th>Movimientos</th><th /></tr></thead><tbody>{loading ? <tr><td colSpan="6">Cargando...</td></tr> : users.map(item => <tr key={item.id}><td><strong>{item.display_name || `${item.first_name} ${item.last_name}`}</strong><small className="d-block text-muted">#{item.id}</small></td><td>{item.email}<small className="d-block text-muted">{item.phone || "Sin teléfono"}</small></td><td>{item.status === "active" ? "Activo" : "Inactivo"}</td><td>{item.directory_count || 0}</td><td>{item.movement_count || 0}</td><td><button type="button" className="btn btn-outline-success btn-sm" onClick={() => openUser(item.id)}>Ver detalle</button></td></tr>)}{!loading && !users.length && <tr><td colSpan="6">No hay usuarios.</td></tr>}</tbody></table></div>
        </section>
        {selected && detail && <section className="tags_dashboard_table_card mt-3 p-3"><div className="d-flex justify-content-between align-items-start gap-3"><div><span className="tags_dashboard_kicker">DETALLE DE CUENTA</span><h2>{selected.display_name || `${selected.first_name} ${selected.last_name}`}</h2><p className="text-muted">Creado: {date(selected.created_at)} · Último ingreso: {date(selected.last_login_at)}</p></div><button type="button" className="btn btn-outline-danger btn-sm" onClick={deactivate}>Desactivar acceso</button></div>
            <form onSubmit={save} className="row g-3"><div className="col-md-6"><label className="form-label">Nombre<input className="form-control" value={selected.first_name || ""} onChange={e => setSelected({ ...selected, first_name: e.target.value })} /></label></div><div className="col-md-6"><label className="form-label">Apellido<input className="form-control" value={selected.last_name || ""} onChange={e => setSelected({ ...selected, last_name: e.target.value })} /></label></div><div className="col-md-6"><label className="form-label">Teléfono<input className="form-control" value={selected.phone || ""} onChange={e => setSelected({ ...selected, phone: e.target.value })} /></label></div><div className="col-md-6"><label className="form-label">WhatsApp<input className="form-control" value={selected.whatsapp || ""} onChange={e => setSelected({ ...selected, whatsapp: e.target.value })} /></label></div><div className="col-md-4"><label className="form-label">Documento<input className="form-control" value={selected.document_number || ""} onChange={e => setSelected({ ...selected, document_number: e.target.value })} /></label></div><div className="col-md-4"><label className="form-label">Localidad<input className="form-control" value={selected.locality || ""} onChange={e => setSelected({ ...selected, locality: e.target.value })} /></label></div><div className="col-md-4"><label className="form-label">Provincia<input className="form-control" value={selected.province || ""} onChange={e => setSelected({ ...selected, province: e.target.value })} /></label></div><div className="col-12"><button className="btn btn-success">Guardar cambios</button></div></form>
            <hr /><h3 className="h5">Directorios</h3><ul>{detail.memberships.map(item => <li key={item.id}>{item.directory_name || item.directory_code} · {item.status}</li>)}{!detail.memberships.length && <li>Sin membresías.</li>}</ul><h3 className="h5 mt-4">Movimientos de fidelización</h3><div className="table-responsive"><table className="table table-sm"><thead><tr><th>Fecha</th><th>Negocio</th><th>Programa</th><th>Movimiento</th><th>Detalle</th></tr></thead><tbody>{detail.movements.map(item => <tr key={item.id}><td>{date(item.created_at)}</td><td>{item.business_name || "-"}</td><td>{item.program_name}</td><td>{item.transaction_type}</td><td>{item.description || "-"}</td></tr>)}{!detail.movements.length && <tr><td colSpan="5">Sin movimientos.</td></tr>}</tbody></table></div>
        </section>}
    </main>;
}
