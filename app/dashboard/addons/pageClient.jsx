"use client";

// =====================================
// PAGE CLIENT: /dashboard/addons
// Descripción: CRUD admin del catálogo global de complementos.
// =====================================

import { useEffect, useState } from "react";
import showAlert from "@/app/components/showAlert";

import "../../styles/tagsModals.css";

const emptyForm = {
    code: "",
    name: "",
    description: "",
    default_quantity: 1,
    price: 0,
    currency: "ARS",
    is_active: true,
    is_public: true,
    sort_order: 0
};

function bool(value) {
    return Number(value) === 1 || value === true;
}

export default function AddonsPageClient() {

    const [addons, setAddons] = useState([]);
    const [search, setSearch] = useState("");

    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const [form, setForm] = useState(emptyForm);
    const [editForm, setEditForm] = useState(emptyForm);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        const res = await fetch("/api/addons/list");
        const data = await res.json().catch(() => []);

        setAddons(Array.isArray(data) ? data : []);
    }

    function updateForm(key, value) {
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

    function closeCreate() {
        setOpen(false);
        setForm(emptyForm);
    }

    function closeEdit() {
        setEditOpen(false);
        setEditForm(emptyForm);
    }

    function openEdit(addon) {
        setEditForm({
            id: addon.id,
            code: addon.code || "",
            name: addon.name || "",
            description: addon.description || "",
            default_quantity: addon.default_quantity || 1,
            price: addon.price || 0,
            currency: addon.currency || "ARS",
            is_active: bool(addon.is_active),
            is_public: bool(addon.is_public),
            sort_order: addon.sort_order || 0
        });

        setEditOpen(true);
    }

    async function create() {
        if (!form.code || !form.name) {
            showAlert({
                title: "Error",
                text: "Código y nombre son obligatorios",
                icon: "error"
            });
            return;
        }

        const res = await fetch("/api/addons/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ...form,
                default_quantity: Number(form.default_quantity || 1),
                price: Number(form.price || 0),
                sort_order: Number(form.sort_order || 0)
            })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showAlert({
                title: "Error",
                text: data.error || "No se pudo crear el festure / Producto",
                icon: "error"
            });
            return;
        }

        showAlert({
            title: "OK",
            text: "Feature / Producto creado correctamente",
            icon: "success"
        });

        closeCreate();
        load();
    }

    async function saveEdit() {
        if (!editForm.id || !editForm.code || !editForm.name) {
            showAlert({
                title: "Error",
                text: "Código y nombre son obligatorios",
                icon: "error"
            });
            return;
        }

        const res = await fetch("/api/addons/update", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ...editForm,
                default_quantity: Number(editForm.default_quantity || 1),
                price: Number(editForm.price || 0),
                sort_order: Number(editForm.sort_order || 0)
            })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showAlert({
                title: "Error",
                text: data.error || "No se pudo actualizar el festure / Producto",
                icon: "error"
            });
            return;
        }

        showAlert({
            title: "OK",
            text: "Feature / Producto actualizado correctamente",
            icon: "success"
        });

        closeEdit();
        load();
    }

    async function removeAddon(id) {
        const confirmed = await showAlert({
            title: "¿Desactivar Feature/Producto?",
            text: "El Feature/Producto quedará oculto/inactivo, pero no se perderá el historial.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Desactivar",
            cancelButtonText: "Cancelar"
        });

        if (!confirmed) return;

        const res = await fetch(`/api/addons/delete?id=${id}`, {
            method: "DELETE"
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showAlert({
                title: "Error",
                text: data.error || "No se pudo desactivar",
                icon: "error"
            });
            return;
        }

        showAlert({
            title: "OK",
            text: "Feature/Producto desactivado",
            icon: "success"
        });

        load();
    }

    const filteredAddons = addons.filter(addon => {
        const term = search.toLowerCase();

        return (
            addon.name?.toLowerCase().includes(term) ||
            addon.code?.toLowerCase().includes(term)
        );
    });

    function renderCheckbox(formData, updater, key, label) {
        return (
            <label>
                <input
                    type="checkbox"
                    checked={!!formData[key]}
                    onChange={(e) =>
                        updater(key, e.target.checked)
                    }
                />

                {label}
            </label>
        );
    }

    function renderFormFields(formData, updater) {
        return (
            <div className="tags_modal_form_grid">

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Nombre
                    </label>

                    <input
                        className="tags_modal_input tags_text_normal"
                        value={formData.name}
                        onChange={(e) =>
                            updater("name", e.target.value)
                        }
                        placeholder="QR-Page"
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Código
                    </label>

                    <input
                        className="tags_modal_input tags_text_normal"
                        value={formData.code}
                        onChange={(e) =>
                            updater("code", e.target.value)
                        }
                        placeholder="qr_page"
                    />
                </div>

                <div className="tags_modal_group tags_modal_form_full">
                    <label className="tags_modal_label">
                        Descripción
                    </label>

                    <textarea
                        className="tags_modal_input tags_text_normal"
                        value={formData.description}
                        onChange={(e) =>
                            updater("description", e.target.value)
                        }
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Cantidad default
                    </label>

                    <input
                        type="number"
                        min="1"
                        className="tags_modal_input tags_text_normal"
                        value={formData.default_quantity}
                        onChange={(e) =>
                            updater("default_quantity", e.target.value)
                        }
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Precio
                    </label>

                    <input
                        type="number"
                        min="0"
                        className="tags_modal_input tags_text_normal"
                        value={formData.price}
                        onChange={(e) =>
                            updater("price", e.target.value)
                        }
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Moneda
                    </label>

                    <input
                        className="tags_modal_input tags_text_normal"
                        value={formData.currency}
                        onChange={(e) =>
                            updater("currency", e.target.value)
                        }
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Orden visual
                    </label>

                    <input
                        type="number"
                        className="tags_modal_input tags_text_normal"
                        value={formData.sort_order}
                        onChange={(e) =>
                            updater("sort_order", e.target.value)
                        }
                    />
                </div>

                <div className="tags_modal_group tags_modal_form_full">
                    <label className="tags_modal_label">
                        Estado
                    </label>

                    <div className="tags_modal_flags_grid">
                        {renderCheckbox(
                            formData,
                            updater,
                            "is_active",
                            "Activo"
                        )}

                        {renderCheckbox(
                            formData,
                            updater,
                            "is_public",
                            "Público"
                        )}
                    </div>
                </div>

            </div>
        );
    }

    return (
        <div className="container-fluid m-0 p-3">

            <div className="row d-flex justify-content-between align-items-center mt-3 mb-4">

                <div className="col-12 col-md-6 d-flex align-items-center gap-3">
                    <h1 className="tags_title">
                        Features / Productos
                    </h1>

                    <button
                        className="tags_btn rounded tags_text_normal"
                        style={{ maxWidth: "210px" }}
                        onClick={() => setOpen(true)}
                    >
                        ✚ Nuevo
                    </button>
                </div>

                <div className="col-12 col-md-4">
                    <input
                        type="text"
                        className="form-control tags_text_normal"
                        placeholder="Buscar Feature/Producto..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />
                </div>

            </div>

            <div className="tags_table_wrapper mb-5 pb-5">
                <table className="tags_table tags_text_normal">
                    <thead>
                        <tr>
                            <th>Orden</th>
                            <th>Producto</th>
                            <th>Código</th>
                            <th>Precio</th>
                            <th>Cant. default</th>
                            <th className="text-center">Activo</th>
                            <th className="text-center">Público</th>
                            <th className="text-center">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredAddons.map(addon => (
                            <tr key={addon.id}>
                                <td>{addon.sort_order || 0}</td>

                                <td className="bold">
                                    {addon.name}
                                </td>

                                <td>
                                    {addon.code}
                                </td>

                                <td>
                                    {addon.currency || "ARS"} {Number(addon.price || 0).toLocaleString("es-AR")}
                                </td>

                                <td>
                                    {addon.default_quantity || 1}
                                </td>

                                <td className="text-center">
                                    {bool(addon.is_active) ? "✅" : "❌"}
                                </td>

                                <td className="text-center">
                                    {bool(addon.is_public) ? "✅" : "❌"}
                                </td>

                                <td className="text-center">
                                    <div className="tags_actions">

                                        <button
                                            className="icon_btn"
                                            title="Editar"
                                            onClick={() =>
                                                openEdit(addon)
                                            }
                                        >
                                            ✏️
                                        </button>

                                        <button
                                            className="icon_btn danger"
                                            title="Desactivar"
                                            onClick={() =>
                                                removeAddon(addon.id)
                                            }
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

            {open && (
                <div className="tags_modal_overlay tags_text_normal">
                    <div className="tags_modal_card tags_modal_large">

                        <button
                            className="tags_modal_close"
                            onClick={closeCreate}
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header text-center">
                            <h2 className="tags_modal_title tags_title">
                                Nueva Feature/Producto
                            </h2>

                            <p className="tags_modal_description">
                                Definí una Feature/Producto comercial de la plataforma
                            </p>
                        </div>

                        <div className="tags_modal_body">
                            {renderFormFields(form, updateForm)}
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
                                onClick={closeCreate}
                            >
                                ✖ Cancelar
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {editOpen && (
                <div className="tags_modal_overlay tags_text_normal">
                    <div className="tags_modal_card tags_modal_large">

                        <button
                            className="tags_modal_close"
                            onClick={closeEdit}
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header text-center">
                            <h2 className="tags_modal_title tags_title">
                                Editar Feature/Producto
                            </h2>

                            <p className="tags_modal_description">
                                Actualizá el Feature/Producto comercial
                            </p>
                        </div>

                        <div className="tags_modal_body">
                            {renderFormFields(editForm, updateEditForm)}
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
                                onClick={closeEdit}
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