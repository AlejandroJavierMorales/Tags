"use client";

// =====================================
// PAGE CLIENT: /dashboard/plans
// Descripción: CRUD admin de planes comerciales.
// =====================================

import { useEffect, useState } from "react";
import showAlert from "@/app/components/showAlert";

import "../../styles/tagsModals.css";

const emptyForm = {
    name: "",
    code: "",
    description: "",
    price: 0,
    currency: "ARS",
    max_qr_codes: 3,

    dashboard_enabled: true,
    reports_enabled: false,
    reports_email_enabled: false,
    reports_whatsapp_enabled: false,
    analytics_enabled: false,
    analytics_plus_enabled: false,
    allow_pause_qr: true,
    allow_edit_qr: true,
    priority_support: false,

    is_active: true,
    is_public: true,
    is_free: false,
    sort_order: 0
};

function bool(value) {
    return Number(value) === 1 || value === true;
}

export default function PlansPageClient() {

    const [plans, setPlans] =
        useState([]);

    const [search, setSearch] =
        useState("");

    const [open, setOpen] =
        useState(false);

    const [editOpen, setEditOpen] =
        useState(false);

    const [form, setForm] =
        useState(emptyForm);

    const [editForm, setEditForm] =
        useState(emptyForm);

    useEffect(() => {
        load();
    }, []);

    async function load() {

        const res =
            await fetch("/api/plans/list");

        const data =
            await res.json().catch(() => []);

        setPlans(
            Array.isArray(data)
                ? data
                : []
        );
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

    function openEdit(plan) {

        setEditForm({
            id: plan.id,

            name:
                plan.name || "",

            code:
                plan.code || "",

            description:
                plan.description || "",

            price:
                plan.price || 0,

            currency:
                plan.currency || "ARS",

            max_qr_codes:
                plan.max_qr_codes || 0,

            dashboard_enabled:
                bool(plan.dashboard_enabled),

            reports_enabled:
                bool(plan.reports_enabled),

            reports_email_enabled:
                bool(plan.reports_email_enabled),

            reports_whatsapp_enabled:
                bool(plan.reports_whatsapp_enabled),

            analytics_enabled:
                bool(plan.analytics_enabled),

            analytics_plus_enabled:
                bool(plan.analytics_plus_enabled),

            allow_pause_qr:
                bool(plan.allow_pause_qr),

            allow_edit_qr:
                bool(plan.allow_edit_qr),

            priority_support:
                bool(plan.priority_support),

            is_active:
                bool(plan.is_active),

            is_public:
                bool(plan.is_public),

            is_free:
                bool(plan.is_free),

            sort_order:
                plan.sort_order || 0
        });

        setEditOpen(true);
    }

    function closeCreate() {

        setOpen(false);
        setForm(emptyForm);
    }

    function closeEdit() {

        setEditOpen(false);
        setEditForm(emptyForm);
    }

    async function create() {

        if (!form.name || !form.code) {

            showAlert({
                title: "Error",
                text: "Nombre y código son obligatorios",
                icon: "error"
            });

            return;
        }

        const res =
            await fetch("/api/plans/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ...form,
                    price:
                        Number(form.price || 0),

                    max_qr_codes:
                        Number(form.max_qr_codes || 0),

                    sort_order:
                        Number(form.sort_order || 0)
                })
            });

        const data =
            await res.json().catch(() => ({}));

        if (!res.ok) {

            showAlert({
                title: "Error",
                text:
                    data.error ||
                    "No se pudo crear el plan",
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text: "Plan creado correctamente",
            icon: "success"
        });

        closeCreate();
        load();
    }

    async function saveEdit() {

        if (
            !editForm.id ||
            !editForm.name ||
            !editForm.code
        ) {

            showAlert({
                title: "Error",
                text: "Nombre y código son obligatorios",
                icon: "error"
            });

            return;
        }

        const res =
            await fetch("/api/plans/update", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ...editForm,
                    price:
                        Number(editForm.price || 0),

                    max_qr_codes:
                        Number(editForm.max_qr_codes || 0),

                    sort_order:
                        Number(editForm.sort_order || 0)
                })
            });

        const data =
            await res.json().catch(() => ({}));

        if (!res.ok) {

            showAlert({
                title: "Error",
                text:
                    data.error ||
                    "No se pudo actualizar el plan",
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text: "Plan actualizado correctamente",
            icon: "success"
        });

        closeEdit();
        load();
    }

    async function removePlan(id) {

        const confirmed =
            await showAlert({
                title: "¿Desactivar plan?",
                text: "El plan quedará oculto/inactivo, pero no se perderá el historial.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Desactivar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) return;

        const res =
            await fetch(`/api/plans/delete?id=${id}`, {
                method: "DELETE"
            });

        const data =
            await res.json().catch(() => ({}));

        if (!res.ok) {

            showAlert({
                title: "Error",
                text:
                    data.error ||
                    "No se pudo desactivar el plan",
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text: "Plan desactivado",
            icon: "success"
        });

        load();
    }

    const filteredPlans =
        plans.filter(plan => {

            const term =
                search.toLowerCase();

            return (
                plan.name?.toLowerCase().includes(term) ||
                plan.code?.toLowerCase().includes(term)
            );
        });

    function renderCheckbox(
        formData,
        updater,
        key,
        label
    ) {

        return (
            <label>
                <input
                    type="checkbox"
                    checked={!!formData[key]}
                    onChange={(e) =>
                        updater(
                            key,
                            e.target.checked
                        )
                    }
                />

                {label}
            </label>
        );
    }

    function renderFormFields(
        formData,
        updater
    ) {

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
                            updater(
                                "name",
                                e.target.value
                            )
                        }
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
                            updater(
                                "code",
                                e.target.value
                            )
                        }
                        placeholder="free, reports, business"
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
                            updater(
                                "description",
                                e.target.value
                            )
                        }
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Precio
                    </label>

                    <input
                        type="number"
                        className="tags_modal_input tags_text_normal"
                        value={formData.price}
                        onChange={(e) =>
                            updater(
                                "price",
                                e.target.value
                            )
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
                            updater(
                                "currency",
                                e.target.value
                            )
                        }
                    />
                </div>

                <div className="tags_modal_group">
                    <label className="tags_modal_label">
                        Máximo QRs
                    </label>

                    <input
                        type="number"
                        className="tags_modal_input tags_text_normal"
                        value={formData.max_qr_codes}
                        onChange={(e) =>
                            updater(
                                "max_qr_codes",
                                e.target.value
                            )
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
                            updater(
                                "sort_order",
                                e.target.value
                            )
                        }
                    />
                </div>

                <div className="tags_modal_group tags_modal_form_full">
                    <label className="tags_modal_label">
                        Permisos y visibilidad
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

                        {renderCheckbox(
                            formData,
                            updater,
                            "is_free",
                            "Plan Free"
                        )}

                        {renderCheckbox(
                            formData,
                            updater,
                            "dashboard_enabled",
                            "Dashboard"
                        )}

                        {renderCheckbox(
                            formData,
                            updater,
                            "allow_edit_qr",
                            "Permite editar QR"
                        )}

                        {renderCheckbox(
                            formData,
                            updater,
                            "allow_pause_qr",
                            "Permite pausar/reactivar QR"
                        )}

                        {renderCheckbox(
                            formData,
                            updater,
                            "reports_enabled",
                            "Reportes"
                        )}

                        {renderCheckbox(
                            formData,
                            updater,
                            "reports_email_enabled",
                            "Reportes por email"
                        )}

                        {renderCheckbox(
                            formData,
                            updater,
                            "reports_whatsapp_enabled",
                            "Reportes por WhatsApp"
                        )}

                        {renderCheckbox(
                            formData,
                            updater,
                            "analytics_enabled",
                            "Analytics"
                        )}

                        {renderCheckbox(
                            formData,
                            updater,
                            "analytics_plus_enabled",
                            "Analytics Plus"
                        )}

                        {renderCheckbox(
                            formData,
                            updater,
                            "priority_support",
                            "Soporte prioritario"
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
                        Planes
                    </h1>

                    <button
                        className="tags_btn rounded tags_text_normal"
                        style={{
                            maxWidth: "170px"
                        }}
                        onClick={() =>
                            setOpen(true)
                        }
                    >
                        ✚ Nuevo plan
                    </button>
                </div>

                <div className="col-12 col-md-4">
                    <input
                        type="text"
                        className="form-control tags_text_normal"
                        placeholder="Buscar plan..."
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
                            <th>Plan</th>
                            <th>Código</th>
                            <th>Precio</th>
                            <th>QRs</th>
                            <th className="text-center">Activo</th>
                            <th className="text-center">Público</th>
                            <th className="text-center">Free</th>
                            <th className="text-center">Analytics</th>
                            <th className="text-center">Analytics Plus</th>
                            <th className="text-center">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredPlans.map(plan => (

                            <tr key={plan.id}>

                                <td>
                                    {plan.sort_order || 0}
                                </td>

                                <td className="bold">
                                    {plan.name}
                                </td>

                                <td>
                                    {plan.code}
                                </td>

                                <td>
                                    {plan.currency || "ARS"} {plan.price || 0}
                                </td>

                                <td>
                                    {plan.max_qr_codes || 0}
                                </td>

                                <td className="text-center">
                                    {bool(plan.is_active) ? "✅" : "❌"}
                                </td>

                                <td className="text-center">
                                    {bool(plan.is_public) ? "✅" : "❌"}
                                </td>

                                <td className="text-center">
                                    {bool(plan.is_free) ? "✅" : "❌"}
                                </td>

                                <td className="text-center">
                                    {bool(plan.analytics_enabled) ? "✅" : "❌"}
                                </td>

                                <td className="text-center">
                                    {bool(plan.analytics_plus_enabled) ? "✅" : "❌"}
                                </td>

                                <td className="text-center">
                                    <div className="tags_actions">

                                        <button
                                            className="icon_btn"
                                            title="Editar"
                                            onClick={() =>
                                                openEdit(plan)
                                            }
                                        >
                                            ✏️
                                        </button>

                                        <button
                                            className="icon_btn danger"
                                            title="Desactivar"
                                            onClick={() =>
                                                removePlan(plan.id)
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
                                Nuevo plan
                            </h2>

                            <p className="tags_modal_description">
                                Definí límites y permisos del plan
                            </p>
                        </div>

                        <div className="tags_modal_body">
                            {renderFormFields(
                                form,
                                updateForm
                            )}
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
                                Editar plan
                            </h2>

                            <p className="tags_modal_description">
                                Actualizá límites y permisos
                            </p>
                        </div>

                        <div className="tags_modal_body">
                            {renderFormFields(
                                editForm,
                                updateEditForm
                            )}
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