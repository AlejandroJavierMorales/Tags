"use client";

// =====================================
// PAGE CLIENT: /dashboard/business-addons
// Descripción: CRUD admin de addons asignados a clientes.
// =====================================

import { useEffect, useState } from "react";
import showAlert from "@/app/components/showAlert";
import { useParams } from "next/navigation";


import "../../../../styles/tagsModals.css";

const STATUS_OPTIONS = [
    {
        code: "active",
        label: "Activo"
    },
    {
        code: "inactive",
        label: "Inactivo"
    },
    {
        code: "cancelled",
        label: "Cancelado"
    },
    {
        code: "expired",
        label: "Vencido"
    }
];

function getStatusLabel(status) {
    return STATUS_OPTIONS.find(s => s.code === status)?.label || status;
}

function formatDate(value) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("es-AR");
}

function toInputDate(value) {
    if (!value) return "";

    return new Date(value).toISOString().slice(0, 10);
}





export default function BusinessAddonsPageClient() {

    const { id } = useParams();

    const [addonOptions, setAddonOptions] =
        useState([]);

    const [addons, setAddons] =
        useState([]);

    const [search, setSearch] =
        useState("");

    const [open, setOpen] =
        useState(false);

    const [editOpen, setEditOpen] =
        useState(false);

    const [editId, setEditId] =
        useState(null);

    const [form, setForm] =
        useState({
            addon_code: "",
            quantity: 1,
            amount: 0,
            currency: "ARS",
            started_at: "",
            expires_at: "",
            notes: ""
        });

    const [editForm, setEditForm] =
        useState({
            quantity: 1,
            status: "active",
            amount: 0,
            currency: "ARS",
            started_at: "",
            expires_at: "",
            notes: ""
        });

    useEffect(() => {
        load();
        loadAddonOptions();
    }, []);

    function getAddonLabel(code) {
        return addonOptions.find(a => a.code === code)?.name || code;
    }

    function getAddonByCode(code) {
        return addonOptions.find(a => a.code === code) || null;
    }

    async function load() {

        const res =
            await fetch("/api/business/addons/list");

        const data =
            await res.json().catch(() => []);

        setAddons(
            Array.isArray(data)
                ? data
                : []
        );
    }


    async function loadAddonOptions() {

        const res =
            await fetch("/api/addons/list");

        const data =
            await res.json().catch(() => []);

        const activeAddons =
            Array.isArray(data)
                ? data.filter(a => Number(a.is_active) === 1)
                : [];

        setAddonOptions(activeAddons);

        if (
            activeAddons.length &&
            !form.addon_code
        ) {
            const firstAddon =
                activeAddons[0];

            setForm(prev => ({
                ...prev,
                addon_code: firstAddon.code,
                quantity: Number(firstAddon.default_quantity || 1),
                amount: Number(firstAddon.price || 0),
                currency: firstAddon.currency || "ARS"
            }));
        }
    }

    function updateForm(key, value) {

        if (key === "addon_code") {

            const selectedAddon =
                getAddonByCode(value);

            setForm(prev => ({
                ...prev,
                addon_code: value,
                quantity: Number(selectedAddon?.default_quantity || 1),
                amount: Number(selectedAddon?.price || 0),
                currency: selectedAddon?.currency || "ARS"
            }));

            return;
        }

        setForm(prev => ({
            ...prev,
            [key]: value
        }));
    }

    function updateEditForm(key, value) {
        setEditForm(prev => ({
            ...prev,
            [key]: value
        }));
    }

    function resetForm() {

        const firstAddon =
            addonOptions[0] || null;

        setForm({
            business_id: "",
            addon_code: firstAddon?.code || "",
            quantity: Number(firstAddon?.default_quantity || 1),
            amount: Number(firstAddon?.price || 0),
            currency: firstAddon?.currency || "ARS",
            started_at: "",
            expires_at: "",
            notes: ""
        });
    }

    async function create() {

        if (!id) {
            showAlert({
                title: "Error",
                text: "No se encontró el cliente en la URL",
                icon: "error"
            });
            return;
        }

        if (!form.addon_code) {
            showAlert({
                title: "Error",
                text: "Debés seleccionar un complemento",
                icon: "error"
            });
            return;
        }

        if (!form.quantity || Number(form.quantity) < 1) {
            showAlert({
                title: "Error",
                text: "Cantidad inválida",
                icon: "error"
            });
            return;
        }

        const res =
            await fetch("/api/business/addons/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ...form,
                    business_id: id,
                    quantity: Number(form.quantity),
                    amount: Number(form.amount || 0)
                })
            });

        const data =
            await res.json().catch(() => ({}));

        if (!res.ok) {
            showAlert({
                title: "Error",
                text: data.error || "No se pudo asignar el complemento",
                icon: "error"
            });
            return;
        }

        showAlert({
            title: "OK",
            text: "Complemento asignado correctamente",
            icon: "success"
        });

        setOpen(false);
        resetForm();
        load();
    }

    function openEdit(addon) {

        setEditId(addon.id);

        setEditForm({
            quantity: addon.quantity || 1,
            status: addon.status || "active",
            amount: addon.amount || 0,
            currency: addon.currency || "ARS",
            started_at: toInputDate(addon.started_at),
            expires_at: toInputDate(addon.expires_at),
            notes: addon.notes || ""
        });

        setEditOpen(true);
    }

    async function saveEdit() {

        if (!editId) return;

        if (!editForm.quantity || Number(editForm.quantity) < 1) {
            showAlert({
                title: "Error",
                text: "Cantidad inválida",
                icon: "error"
            });
            return;
        }

        const res =
            await fetch("/api/business/addons/update", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: editId,
                    ...editForm,
                    quantity: Number(editForm.quantity),
                    amount: Number(editForm.amount || 0)
                })
            });

        const data =
            await res.json().catch(() => ({}));

        if (!res.ok) {
            showAlert({
                title: "Error",
                text: data.error || "No se pudo actualizar",
                icon: "error"
            });
            return;
        }

        showAlert({
            title: "OK",
            text: "Complemento actualizado correctamente",
            icon: "success"
        });

        setEditOpen(false);
        setEditId(null);
        load();
    }

    async function removeAddon(id) {

        const confirmed =
            await showAlert({
                title: "¿Eliminar complemento?",
                text: "Esta acción no se puede deshacer",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Eliminar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) return;

        const res =
            await fetch(`/api/business/addons/delete?id=${id}`, {
                method: "DELETE"
            });

        const data =
            await res.json().catch(() => ({}));

        if (!res.ok) {
            showAlert({
                title: "Error",
                text: data.error || "No se pudo eliminar",
                icon: "error"
            });
            return;
        }

        showAlert({
            title: "OK",
            text: "Complemento eliminado",
            icon: "success"
        });

        load();
    }

    const filteredAddons =
        addons.filter(addon => {

            const term =
                search.toLowerCase();

            return (
                addon.business_name?.toLowerCase().includes(term) ||
                addon.business_email?.toLowerCase().includes(term) ||
                addon.addon_code?.toLowerCase().includes(term) ||
                getAddonLabel(addon.addon_code)?.toLowerCase().includes(term)
            );
        });

    return (
        <div className="container-fluid m-0 p-3">

            <div className="row d-flex justify-content-between align-items-center mt-3 mb-4">

                <div className="col-12 col-md-6 d-flex align-items-center gap-3">

                    <h1 className="tags_title">
                        Asignación de Funcionalidad/Producto al Cliente
                    </h1>

                    <button
                        className="tags_btn rounded tags_text_normal"
                        style={{ maxWidth: "180px" }}
                        onClick={() => setOpen(true)}
                    >
                        ✚ Nuevo
                    </button>

                </div>

                <div className="col-12 col-md-4 mt-4">

                    <input
                        type="text"
                        className="form-control tags_text_normal"
                        placeholder="Buscar cliente, email o addon..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                </div>

            </div>

            <div className="tags_table_wrapper mb-5 pb-5">

                <table className="tags_table tags_text_normal">

                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Email</th>
                            <th>Addon</th>
                            <th className="text-center">Cantidad</th>
                            <th className="text-center">Estado</th>
                            <th>Inicio</th>
                            <th>Vencimiento</th>
                            <th>Monto</th>
                            <th>Notas</th>
                            <th className="text-center">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>

                        {filteredAddons.map(addon => (

                            <tr key={addon.id}>

                                <td className="bold">
                                    {addon.business_name}
                                </td>

                                <td>
                                    {addon.business_email}
                                </td>

                                <td>
                                    {getAddonLabel(addon.addon_code)}
                                </td>

                                <td className="text-center">
                                    {addon.quantity}
                                </td>

                                <td className="text-center">
                                    <span className={`badge ${addon.status}`}>
                                        {getStatusLabel(addon.status)}
                                    </span>
                                </td>

                                <td>
                                    {formatDate(addon.started_at)}
                                </td>

                                <td>
                                    {formatDate(addon.expires_at)}
                                </td>

                                <td>
                                    {addon.currency || "ARS"} {addon.amount || 0}
                                </td>

                                <td>
                                    {addon.notes || "-"}
                                </td>

                                <td className="text-center">

                                    <div className="tags_actions">

                                        <button
                                            className="icon_btn"
                                            title="Editar"
                                            onClick={() => openEdit(addon)}
                                        >
                                            ✏️
                                        </button>

                                        <button
                                            className="icon_btn danger"
                                            title="Eliminar"
                                            onClick={() => removeAddon(addon.id)}
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

            {/* CREATE MODAL */}

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
                                Nuevo addon
                            </h2>

                            <p className="tags_modal_description">
                                Asigná un addon a un cliente
                            </p>

                        </div>

                        <div className="tags_modal_body">

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Funcionalidades / Productos
                                </label>

                                <select
                                    className="tags_modal_input tags_text_normal"
                                    value={form.addon_code}
                                    onChange={(e) =>
                                        updateForm("addon_code", e.target.value)
                                    }
                                >
                                    {addonOptions.map(addon => (
                                        <option
                                            key={addon.code}
                                            value={addon.code}
                                        >
                                            {addon.name} — {addon.currency} {Number(addon.price || 0).toLocaleString("es-AR")}
                                        </option>
                                    ))}
                                </select>

                            </div>

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Cantidad
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    className="tags_modal_input tags_text_normal"
                                    value={form.quantity}
                                    onChange={(e) =>
                                        updateForm("quantity", e.target.value)
                                    }
                                />

                            </div>

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Monto
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    className="tags_modal_input tags_text_normal"
                                    value={form.amount}
                                    onChange={(e) =>
                                        updateForm("amount", e.target.value)
                                    }
                                />

                            </div>

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Moneda
                                </label>

                                <input
                                    className="tags_modal_input tags_text_normal"
                                    value={form.currency}
                                    onChange={(e) =>
                                        updateForm("currency", e.target.value)
                                    }
                                />

                            </div>

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Inicio
                                </label>

                                <input
                                    type="date"
                                    className="tags_modal_input tags_text_normal"
                                    value={form.started_at}
                                    onChange={(e) =>
                                        updateForm("started_at", e.target.value)
                                    }
                                />

                            </div>

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Vencimiento
                                </label>

                                <input
                                    type="date"
                                    className="tags_modal_input tags_text_normal"
                                    value={form.expires_at}
                                    onChange={(e) =>
                                        updateForm("expires_at", e.target.value)
                                    }
                                />

                            </div>

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Notas
                                </label>

                                <textarea
                                    className="tags_modal_input tags_text_normal"
                                    rows={3}
                                    value={form.notes}
                                    onChange={(e) =>
                                        updateForm("notes", e.target.value)
                                    }
                                />

                            </div>

                        </div>

                        <div className="tags_modal_actions">

                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={create}
                            >
                                ✚ Crear
                            </button>

                            <button
                                className="tags_modal_btn tags_modal_btn_cancel"
                                onClick={() => setOpen(false)}
                            >
                                ✖ Cancelar
                            </button>

                        </div>

                    </div>

                </div>

            )}

            {/* EDIT MODAL */}

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
                                Editar addon
                            </h2>

                            <p className="tags_modal_description">
                                Actualizá el addon asignado
                            </p>

                        </div>

                        <div className="tags_modal_body">

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Cantidad
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    className="tags_modal_input tags_text_normal"
                                    value={editForm.quantity}
                                    onChange={(e) =>
                                        updateEditForm("quantity", e.target.value)
                                    }
                                />

                            </div>

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Estado
                                </label>

                                <select
                                    className="tags_modal_input tags_text_normal"
                                    value={editForm.status}
                                    onChange={(e) =>
                                        updateEditForm("status", e.target.value)
                                    }
                                >
                                    {STATUS_OPTIONS.map(status => (
                                        <option
                                            key={status.code}
                                            value={status.code}
                                        >
                                            {status.label}
                                        </option>
                                    ))}
                                </select>

                            </div>

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Monto
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    className="tags_modal_input tags_text_normal"
                                    value={editForm.amount}
                                    onChange={(e) =>
                                        updateEditForm("amount", e.target.value)
                                    }
                                />

                            </div>

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Moneda
                                </label>

                                <input
                                    className="tags_modal_input tags_text_normal"
                                    value={editForm.currency}
                                    onChange={(e) =>
                                        updateEditForm("currency", e.target.value)
                                    }
                                />

                            </div>

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Inicio
                                </label>

                                <input
                                    type="date"
                                    className="tags_modal_input tags_text_normal"
                                    value={editForm.started_at}
                                    onChange={(e) =>
                                        updateEditForm("started_at", e.target.value)
                                    }
                                />

                            </div>

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Vencimiento
                                </label>

                                <input
                                    type="date"
                                    className="tags_modal_input tags_text_normal"
                                    value={editForm.expires_at}
                                    onChange={(e) =>
                                        updateEditForm("expires_at", e.target.value)
                                    }
                                />

                            </div>

                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Notas
                                </label>

                                <textarea
                                    className="tags_modal_input tags_text_normal"
                                    rows={3}
                                    value={editForm.notes}
                                    onChange={(e) =>
                                        updateEditForm("notes", e.target.value)
                                    }
                                />

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