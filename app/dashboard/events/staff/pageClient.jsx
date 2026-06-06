"use client";

import { useEffect, useState }
    from "react";

import showAlert
    from "@/app/components/showAlert";

import "../../../styles/tagsModals.css";

import OwnerNavigation
    from "@/app/modules/e-events/components/OwnerNavigation";

import EventOwnerHeader
    from "@/app/modules/e-events/components/EventOwnerHeader";

export default function EventStaffPageClient({
    session,
    staffPermissions
}) {

    // =========================
    // STATES
    // =========================

    const [staff, setStaff] =
        useState([]);

    const [permissionsByModule, setPermissionsByModule] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [modal, setModal] =
        useState(false);

    const [editing, setEditing] =
        useState(null);

    const [form, setForm] =
        useState({

            name: "",
            email: "",
            phone: "",

            role: "assistant",

            status: "active",

            permissions: []
        });

    // =========================
    // LOAD
    // =========================

    useEffect(() => {

        load();
        loadPermissions();

    }, []);

    async function load() {

        try {

            setLoading(true);

            const res =
                await fetch(
                    "/api/events/staff/list",
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({

                    title: "Error",

                    text:
                        data.error ||
                        "No se pudo cargar el staff",

                    icon: "error"
                });

                return;
            }

            setStaff(
                data.data || []
            );

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);
        }
    }

    async function loadPermissions() {

        try {

            const res =
                await fetch(
                    "/api/events/staff/getPermissions",
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                console.log(data.error);

                return;
            }

            setPermissionsByModule(
                data.data || []
            );

        } catch (err) {

            console.log(err);
        }
    }

    // =========================
    // HELPERS
    // =========================

    function updateField(key, value) {

        setForm(prev => ({
            ...prev,
            [key]: value
        }));
    }

    function togglePermission(code) {

        setForm(prev => {

            const exists =
                prev.permissions.includes(code);

            if (exists) {

                return {

                    ...prev,

                    permissions:
                        prev.permissions.filter(
                            p => p !== code
                        )
                };
            }

            return {

                ...prev,

                permissions: [
                    ...prev.permissions,
                    code
                ]
            };
        });
    }

    function resetForm() {

        setEditing(null);

        setForm({

            name: "",
            email: "",
            phone: "",

            role: "assistant",

            status: "active",

            permissions: []
        });
    }

    // =========================
    // MODALS
    // =========================

    function openCreate() {

        resetForm();

        setModal(true);
    }

    function openEdit(item) {

        setEditing(item);

        setForm({

            name:
                item.name || "",

            email:
                item.email || "",

            phone:
                item.phone || "",

            role:
                item.role || "assistant",

            status:
                item.status || "active",

            permissions:
                item.permissions || []
        });

        setModal(true);
    }

    function closeModal() {

        setModal(false);

        resetForm();
    }

    // =========================
    // SAVE
    // =========================

    async function saveStaff() {

        try {

            if (
                !form.name ||
                !form.email
            ) {

                showAlert({

                    title: "Error",

                    text:
                        "Nombre y email requeridos",

                    icon: "error"
                });

                return;
            }

            const body = {

                id:
                    editing?.id,

                ...form
            };

            const res =
                await fetch(

                    editing
                        ? "/api/events/staff/update"
                        : "/api/events/staff/create",

                    {

                        method:
                            editing
                                ? "PUT"
                                : "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(body)
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({

                    title: "Error",

                    text:
                        data.error ||
                        "No se pudo guardar",

                    icon: "error"
                });

                return;
            }

            showAlert({

                title: "OK",

                text:
                    editing
                        ? "Staff actualizado"
                        : "Staff creado",

                icon: "success"
            });

            closeModal();

            load();

        } catch (err) {

            console.log(err);

            showAlert({

                title: "Error",

                text:
                    "Error interno",

                icon: "error"
            });
        }
    }

    // =========================
    // DELETE
    // =========================

    async function deleteStaff(id) {

        const confirm =
            await showAlert({

                title:
                    "Eliminar staff?",

                text:
                    "Esta acción no se puede deshacer",

                icon: "warning",

                showCancelButton: true
            });

        if (!confirm) return;

        try {

            const res =
                await fetch(
                    "/api/events/staff/delete",
                    {

                        method: "DELETE",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                id
                            })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {

                showAlert({

                    title: "Error",

                    text:
                        data.error ||
                        "No se pudo eliminar",

                    icon: "error"
                });

                return;
            }

            showAlert({

                title: "OK",

                text:
                    "Staff eliminado",

                icon: "success"
            });

            load();

        } catch (err) {

            console.log(err);
        }
    }

    // =========================
    // BADGES
    // =========================

    function statusBadge(status) {

        switch (status) {

            case "active":
                return "badge active";

            case "inactive":
                return "badge danger";

            default:
                return "badge";
        }
    }

    // =========================
    // UI
    // =========================

    return (

        <div className="container-fluid tags_container m-0 p-0">

            <EventOwnerHeader session={session} />

            <div className="p-2">

                <OwnerNavigation session={session} />

                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">

                    <div>

                        <h2 className="tags_title mb-1">
                            👥 Staff Global
                        </h2>

                        <div className="opacity-75">

                            Administración de empleados,
                            accesos y permisos.

                        </div>

                    </div>

                    <button
                        className="tags_btn"
                        onClick={openCreate}
                    >
                        ✚ Nuevo Staff
                    </button>

                </div>

                {/* TABLE */}
                <div className="tags_table_wrapper">

                    <table className="tags_table tags_text_normal">

                        <thead>

                            <tr>

                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Permisos</th>
                                <th>Último acceso</th>
                                <th>Acciones</th>

                            </tr>

                        </thead>

                        <tbody>

                            {!loading && staff.length === 0 && (

                                <tr>

                                    <td
                                        colSpan={7}
                                        className="text-center p-4"
                                    >
                                        No hay staff cargado
                                    </td>

                                </tr>
                            )}

                            {staff.map(item => (

                                <tr key={item.id}>

                                    <td>

                                        <strong>
                                            {item.name}
                                        </strong>

                                    </td>

                                    <td>
                                        {item.email || "-"}
                                    </td>

                                    <td>
                                        {item.role}
                                    </td>

                                    <td>

                                        <span
                                            className={statusBadge(item.status)}
                                        >
                                            {item.status}
                                        </span>

                                    </td>

                                    <td>

                                        <div
                                            className="d-flex flex-wrap gap-1"
                                            style={{
                                                maxWidth: 320
                                            }}
                                        >

                                            {(item.permissions || []).map(permission => (

                                                <span
                                                    key={permission}
                                                    className="badge pending"
                                                >
                                                    {permission}
                                                </span>

                                            ))}

                                        </div>

                                    </td>

                                    <td>

                                        {item.last_login_at
                                            ? new Date(
                                                item.last_login_at
                                            ).toLocaleString()
                                            : "-"}

                                    </td>

                                    <td>

                                        <div className="actions d-flex gap-2 justify-content-center">

                                            <button
                                                className="icon_btn success"
                                                onClick={() =>
                                                    openEdit(item)
                                                }
                                            >
                                                ✏️
                                            </button>

                                            <button
                                                className="icon_btn danger"
                                                onClick={() =>
                                                    deleteStaff(item.id)
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

            </div>

            {/* MODAL */}
            {modal && (

                <div className="tags_modal_overlay">

                    <div className="tags_modal_card tags_staff_modal">

                        <button
                            className="tags_modal_close"
                            onClick={closeModal}
                        >
                            ✕
                        </button>

                        {/* HEADER */}
                        <div className="tags_modal_header">

                            <h2 className="tags_modal_title">

                                {editing
                                    ? "Editar Staff"
                                    : "Nuevo Staff"}

                            </h2>

                            <p className="tags_modal_description">

                                Configuración de accesos y permisos

                            </p>

                        </div>

                        {/* BODY */}
                        <div className="tags_modal_body tags_staff_modal_body">

                            <div className="row g-3 mb-4">

                                <div className="col-md-6">

                                    <div className="tags_modal_group">

                                        <label className="tags_modal_label">
                                            Nombre
                                        </label>

                                        <input
                                            className="tags_modal_input"
                                            value={form.name}
                                            onChange={(e) =>
                                                updateField(
                                                    "name",
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="col-md-6">

                                    <div className="tags_modal_group">

                                        <label className="tags_modal_label">
                                            Email
                                        </label>

                                        <input
                                            className="tags_modal_input"
                                            value={form.email}
                                            onChange={(e) =>
                                                updateField(
                                                    "email",
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="col-md-6">

                                    <div className="tags_modal_group">

                                        <label className="tags_modal_label">
                                            Teléfono
                                        </label>

                                        <input
                                            className="tags_modal_input"
                                            value={form.phone}
                                            onChange={(e) =>
                                                updateField(
                                                    "phone",
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="col-md-3">

                                    <div className="tags_modal_group">

                                        <label className="tags_modal_label">
                                            Rol
                                        </label>

                                        <select
                                            className="tags_modal_input"
                                            value={form.role}
                                            onChange={(e) =>
                                                updateField(
                                                    "role",
                                                    e.target.value
                                                )
                                            }
                                        >

                                            <option value="manager">
                                                Manager
                                            </option>

                                            <option value="scanner">
                                                Scanner
                                            </option>

                                            <option value="assistant">
                                                Assistant
                                            </option>

                                            <option value="security">
                                                Security
                                            </option>

                                            <option value="dj">
                                                DJ
                                            </option>

                                            <option value="photographer">
                                                Photographer
                                            </option>

                                        </select>

                                    </div>

                                </div>

                                <div className="col-md-3">

                                    <div className="tags_modal_group">

                                        <label className="tags_modal_label">
                                            Estado
                                        </label>

                                        <select
                                            className="tags_modal_input"
                                            value={form.status}
                                            onChange={(e) =>
                                                updateField(
                                                    "status",
                                                    e.target.value
                                                )
                                            }
                                        >

                                            <option value="active">
                                                Activo
                                            </option>

                                            <option value="inactive">
                                                Inactivo
                                            </option>

                                        </select>

                                    </div>

                                </div>

                            </div>

                            {/* PERMISSIONS */}
                            <div>

                                <h3 className="mb-3">
                                    🔐 Permisos
                                </h3>

                                <div className="tags_permissions_wrapper">

                                    {(permissionsByModule || []).map(moduleItem => (

                                        <div
                                            key={moduleItem.module}
                                            className="tags_permission_module"
                                        >

                                            <div className="tags_permission_module_title">

                                                {moduleItem.module}

                                            </div>

                                            <div className="tags_permission_grid">

                                                {(moduleItem.permissions || []).map(permission => (

                                                    <label
                                                        key={permission.code}
                                                        className="tags_permission_item"
                                                    >

                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                form.permissions.includes(
                                                                    permission.code
                                                                )
                                                            }
                                                            onChange={() =>
                                                                togglePermission(
                                                                    permission.code
                                                                )
                                                            }
                                                        />

                                                        <span>
                                                            {permission.description}
                                                        </span>

                                                    </label>

                                                ))}

                                            </div>

                                        </div>

                                    ))}

                                </div>

                            </div>

                        </div>

                        {/* ACTIONS */}
                        <div className="tags_modal_actions">

                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={saveStaff}
                            >
                                🖫 Guardar
                            </button>

                            <button
                                className="tags_modal_btn tags_modal_btn_cancel"
                                onClick={closeModal}
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