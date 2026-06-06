"use client";

import { useEffect, useState } from "react";
import TagsHeader from "../../components/Header";
import "../../styles/tagsModals.css";


export default function PlansPage() {

    const [list, setList] = useState([]);
    const [search, setSearch] = useState("");

    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [price, setPrice] = useState("");
    const [currency, setCurrency] = useState("ARS");

    const [editId, setEditId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editCode, setEditCode] = useState("");
    const [editPrice, setEditPrice] = useState("");
    const [editCurrency, setEditCurrency] = useState("ARS");

    const [maxQrCodes, setMaxQrCodes] = useState(0);

    const [dashboardEnabled, setDashboardEnabled] = useState(false);
    const [reportsEnabled, setReportsEnabled] = useState(false);
    const [reportsEmailEnabled, setReportsEmailEnabled] = useState(false);
    const [reportsWhatsappEnabled, setReportsWhatsappEnabled] = useState(false);

    const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
    const [analyticsPlusEnabled, setAnalyticsPlusEnabled] = useState(false);

    const [allowPauseQr, setAllowPauseQr] = useState(false);
    const [allowEditQr, setAllowEditQr] = useState(false);
    const [prioritySupport, setPrioritySupport] = useState(false);

    const [editMaxQrCodes, setEditMaxQrCodes] = useState(0);

    const [editDashboardEnabled, setEditDashboardEnabled] = useState(false);
    const [editReportsEnabled, setEditReportsEnabled] = useState(false);
    const [editReportsEmailEnabled, setEditReportsEmailEnabled] = useState(false);
    const [editReportsWhatsappEnabled, setEditReportsWhatsappEnabled] = useState(false);

    const [editAnalyticsEnabled, setEditAnalyticsEnabled] = useState(false);
    const [editAnalyticsPlusEnabled, setEditAnalyticsPlusEnabled] = useState(false);

    const [editAllowPauseQr, setEditAllowPauseQr] = useState(false);
    const [editAllowEditQr, setEditAllowEditQr] = useState(false);
    const [editPrioritySupport, setEditPrioritySupport] = useState(false);

    // =========================
    // LOAD
    // =========================
    async function load() {
        const res = await fetch("/api/plans/list");
        const data = await res.json().catch(() => []);
        setList(Array.isArray(data) ? data : []);
    }

    useEffect(() => {
        load();
    }, []);

    // =========================
    // CREATE
    // =========================
    async function create() {

        if (!name || !code || !price) return;

        await fetch("/api/plans/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                code,
                price,
                currency
            })
        });

        setName("");
        setCode("");
        setPrice("");
        setOpen(false);

        load();
    }

    // =========================
    // EDIT
    // =========================
    function openEdit(p) {
        setEditId(p.id);
        setEditName(p.name || "");
        setEditCode(p.code || "");
        setEditPrice(p.price || "");
        setEditCurrency(p.currency || "ARS");
        setEditOpen(true);
    }

    async function saveEdit() {

        await fetch("/api/plans/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: editId,
                name: editName,
                code: editCode,
                price: editPrice,
                currency: editCurrency
            })
        });

        setEditOpen(false);
        load();
    }

    // =========================
    // DELETE
    // =========================
    async function remove(id) {

        const confirmed = confirm("¿Seguro que querés eliminar este plan?");
        if (!confirmed) return;

        await fetch(`/api/plans/delete?id=${id}`, {
            method: "DELETE"
        });

        load();
    }

    // =========================
    // FILTER
    // =========================
    const filtered = list.filter(p => {
        const t = search.toLowerCase();
        return (
            p.name?.toLowerCase().includes(t) ||
            p.code?.toLowerCase().includes(t)
        );
    });

    return (
        <div className="container-fluid m-0 p-1">

            <TagsHeader />

            {/* HEADER */}
            <div className="row d-flex justify-content-start align-items-center mt-3 mb-4">

                <div className="col-12 col-md-8 d-flex align-items-center mb-3">

                    <h1 className="tags_title ms-2">Planes</h1>

                    <button
                        className="tags_btn rounded ms-4 tags_text_normal"
                        style={{ maxWidth: "150px" }}
                        onClick={() => setOpen(true)}
                    >
                        ✚ Nuevo plan
                    </button>

                </div>

                <div className="col-12 col-md-4 mb-3">

                    <input
                        type="text"
                        className="form-control tags_text_normal"
                        placeholder="Buscar plan..."
                        style={{ maxWidth: "450px" }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                </div>

            </div>

            {/* TABLE WRAPPER */}
            <div className="tags_table_wrapper mb-5 pb-5">

                <table className="tags_table tags_text_normal">

                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Código</th>
                            <th>Precio</th>
                            <th>Moneda</th>
                            <th>Features</th>
                            <th className="text-center">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map(p => (
                            <tr key={p.id}>

                                <td className="bold">{p.name}</td>
                                <td>{p.code}</td>
                                <td>$ {p.price}</td>
                                <td>{p.currency}</td>
                                <td>

                                    <div className="d-flex flex-wrap gap-1">

                                        {p.dashboard_enabled ? <span className="badge bg-primary">Dash</span> : ''}
                                        {p.reports_enabled ? <span className="badge bg-success">Reports</span> : ''}
                                        {p.reports_email_enabled ? <span className="badge bg-info">Email</span> : ''}
                                        {p.reports_whatsapp_enabled ? <span className="badge bg-success">WA</span> : ''}

                                        {p.analytics_enabled ? <span className="badge bg-warning">Analytics</span> : ''}
                                        {p.analytics_plus_enabled ? <span className="badge bg-danger">Analytics+</span> : ''}

                                        {p.allow_pause_qr ? <span className="badge bg-dark">Pause QR</span> : ''}
                                        {p.allow_edit_qr ? <span className="badge bg-secondary">Edit QR</span> : ''}

                                        {p.priority_support ? <span className="badge bg-danger">VIP</span> : ''}

                                    </div>

                                </td>

                                <td className="text-center">

                                    <div className="tags_actions">

                                        <button
                                            className="icon_btn"
                                            onClick={() => openEdit(p)}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>

                                        <button
                                            className="icon_btn danger"
                                            onClick={() => remove(p.id)}
                                            title="Eliminar"
                                        >
                                            🗑
                                        </button>

                                    </div>

                                </td>

                            </tr>
                        ))}
                    </tbody>

                </table>

            </div>

            {/* ================= CREATE MODAL ================= */}
            {/* ===================================== */}
            {/* CREATE PLAN MODAL */}
            {/* ===================================== */}

            {open && (
                <div className="tags_modal_overlay tags_text_normal">

                    <div className="tags_modal_card">

                        <button
                            className="tags_modal_close"
                            onClick={() => setOpen(false)}
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header text-center">
                            <h2 className="tags_modal_title tags_title">
                                Nuevo plan
                            </h2>
                            <p className="tags_modal_description">
                                Definí características del plan
                            </p>
                        </div>

                        <div className="tags_modal_body">

                            {/* BASIC */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Nombre</label>
                                <input className="tags_modal_input" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>

                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Código</label>
                                <input className="tags_modal_input" value={code} onChange={(e) => setCode(e.target.value)} />
                            </div>

                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Precio</label>
                                <input className="tags_modal_input" value={price} onChange={(e) => setPrice(e.target.value)} />
                            </div>

                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Moneda</label>
                                <input className="tags_modal_input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                            </div>

                            {/* LIMITS */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Max QRs</label>
                                <input
                                    type="number"
                                    className="tags_modal_input"
                                    value={maxQrCodes}
                                    onChange={(e) => setMaxQrCodes(e.target.value)}
                                />
                            </div>

                            {/* FEATURES */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Features</label>

                                <div className="tags_modal_flags_grid">

                                    <label>
                                        <input type="checkbox" checked={dashboardEnabled}
                                            onChange={e => setDashboardEnabled(e.target.checked)} />
                                        Dashboard
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={reportsEnabled}
                                            onChange={e => setReportsEnabled(e.target.checked)} />
                                        Reports
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={reportsEmailEnabled}
                                            onChange={e => setReportsEmailEnabled(e.target.checked)} />
                                        Email
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={reportsWhatsappEnabled}
                                            onChange={e => setReportsWhatsappEnabled(e.target.checked)} />
                                        WhatsApp
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={analyticsEnabled}
                                            onChange={e => setAnalyticsEnabled(e.target.checked)} />
                                        Analytics
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={analyticsPlusEnabled}
                                            onChange={e => setAnalyticsPlusEnabled(e.target.checked)} />
                                        Analytics +
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={allowPauseQr}
                                            onChange={e => setAllowPauseQr(e.target.checked)} />
                                        Pausar QR
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={allowEditQr}
                                            onChange={e => setAllowEditQr(e.target.checked)} />
                                        Editar QR
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={prioritySupport}
                                            onChange={e => setPrioritySupport(e.target.checked)} />
                                        Soporte
                                    </label>

                                </div>
                            </div>

                        </div>

                        <div className="tags_modal_actions">

                            <button className="tags_modal_btn tags_modal_btn_success" onClick={create}>
                                ✚ Crear
                            </button>

                            <button className="tags_modal_btn tags_modal_btn_cancel" onClick={() => setOpen(false)}>
                                ✖ Cancelar
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* ================= EDIT MODAL ================= */}
            {editOpen && (
                <div className="tags_modal_overlay tags_text_normal">
                    <div className="tags_modal_card">

                        <button
                            className="tags_modal_close"
                            onClick={() => setEditOpen(false)}
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header text-center">
                            <h2 className="tags_modal_title tags_title">
                                Editar plan
                            </h2>
                            <p className="tags_modal_description">
                                Actualizá la configuración del plan
                            </p>
                        </div>

                        <div className="tags_modal_body">

                            {/* BASIC INFO */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Nombre</label>
                                <input
                                    className="tags_modal_input tags_text_normal"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                />
                            </div>

                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Code</label>
                                <input
                                    className="tags_modal_input tags_text_normal"
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value)}
                                />
                            </div>

                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Precio</label>
                                <input
                                    className="tags_modal_input tags_text_normal"
                                    type="number"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                />
                            </div>

                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Moneda</label>
                                <input
                                    className="tags_modal_input tags_text_normal"
                                    value={editCurrency}
                                    onChange={(e) => setEditCurrency(e.target.value)}
                                />
                            </div>

                            <div className="tags_modal_group">
                                <label className="tags_modal_label">Máx QRs</label>
                                <input
                                    className="tags_modal_input tags_text_normal"
                                    type="number"
                                    value={editMaxQrCodes}
                                    onChange={(e) => setEditMaxQrCodes(e.target.value)}
                                />
                            </div>

                            {/* FEATURES */}
                            <div className="tags_modal_group">

                                <div className="tags_modal_flags_grid">

                                    <label className="">
                                        <input type="checkbox" checked={editDashboardEnabled}
                                            onChange={e => setEditDashboardEnabled(e.target.checked)} />
                                        Dashboard
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={editReportsEnabled}
                                            onChange={e => setEditReportsEnabled(e.target.checked)} />
                                        Reports
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={editReportsEmailEnabled}
                                            onChange={e => setEditReportsEmailEnabled(e.target.checked)} />
                                        Email
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={editReportsWhatsappEnabled}
                                            onChange={e => setEditReportsWhatsappEnabled(e.target.checked)} />
                                        WhatsApp
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={editAnalyticsEnabled}
                                            onChange={e => setEditAnalyticsEnabled(e.target.checked)} />
                                        Analytics
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={editAnalyticsPlusEnabled}
                                            onChange={e => setEditAnalyticsPlusEnabled(e.target.checked)} />
                                        Analytics +
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={editAllowPauseQr}
                                            onChange={e => setEditAllowPauseQr(e.target.checked)} />
                                        Pause QR
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={editAllowEditQr}
                                            onChange={e => setEditAllowEditQr(e.target.checked)} />
                                        Edit QR
                                    </label>

                                    <label>
                                        <input type="checkbox" checked={editPrioritySupport}
                                            onChange={e => setEditPrioritySupport(e.target.checked)} />
                                        Priority
                                    </label>

                                </div>

                            </div>

                        </div>

                        <div className="tags_modal_actions">
                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={saveEdit}
                            >
                                🖫 Guardar
                            </button>

                            <button
                                className="tags_modal_btn tags_modal_btn_cancel"
                                onClick={() => setEditOpen(false)}
                            >
                                ✖ Cancelar
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}