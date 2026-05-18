"use client";

import { useEffect, useState } from "react";
import TagsHeader from "../components/Header";
import "../styles/tagsModals.css";
import showAlert from "../components/showAlert";

export default function SupportsPage() {

    const [list, setList] = useState([]);

    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    // CREATE
    const [name, setName] = useState("");
    const [type, setType] = useState("");
    const [isDigital, setIsDigital] = useState(false);

    // EDIT
    const [editId, setEditId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState("");
    const [editIsDigital, setEditIsDigital] = useState(false);

    // FILTERS
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterDigital, setFilterDigital] = useState("");

    // TYPES
    const supportTypes = [
        "acrilico",
        "tarjeta",
        "sticker",
        "digital"
    ];

    useEffect(() => {
        load();
    }, []);

    // =========================
    // LOAD
    // =========================
    async function load() {

        try {

            const res = await fetch("/api/supports", {
                cache: "no-store"
            });

            const json = await res.json().catch(() => ({}));

            setList(
                Array.isArray(json.data)
                    ? json.data
                    : []
            );

        } catch (err) {

            console.error("LOAD SUPPORTS ERROR:", err);

            setList([]);
        }
    }

    // =========================
    // FILTERS
    // =========================
    const filteredList = list.filter((s) => {

        const matchSearch =
            !search ||
            s.name?.toLowerCase().includes(
                search.toLowerCase()
            );

        const matchType =
            !filterType ||
            s.type === filterType;

        const matchDigital =
            filterDigital === ""
                ? true
                : String(s.is_digital) === filterDigital;

        return (
            matchSearch &&
            matchType &&
            matchDigital
        );
    });

    // =========================
    // CREATE
    // =========================
    async function create() {

        if (!name.trim()) {

            showAlert({
                title: "Error",
                text: "El nombre es obligatorio",
                icon: "error"
            });

            return;
        }

        if (!type) {

            showAlert({
                title: "Error",
                text: "Seleccioná un tipo",
                icon: "error"
            });

            return;
        }

        try {

            const res = await fetch(
                "/api/supports/create",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        type,
                        is_digital: isDigital
                    })
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "Error creando soporte",
                    icon: "error"
                });

                return;
            }

            showAlert({
                title: "OK",
                text: "Soporte creado",
                icon: "success"
            });

            setName("");
            setType("");
            setIsDigital(false);

            setOpen(false);

            load();

        } catch (err) {

            console.error("CREATE SUPPORT ERROR:", err);

            showAlert({
                title: "Error",
                text: "Error interno",
                icon: "error"
            });
        }
    }

    // =========================
    // OPEN EDIT
    // =========================
    function openEdit(support) {

        setEditId(support.id);

        setEditName(support.name || "");

        setEditType(support.type || "");

        setEditIsDigital(
            Boolean(support.is_digital)
        );

        setEditOpen(true);
    }

    // =========================
    // SAVE EDIT
    // =========================
    async function saveEdit() {

        if (!editName.trim()) {

            showAlert({
                title: "Error",
                text: "El nombre es obligatorio",
                icon: "error"
            });

            return;
        }

        if (!editType) {

            showAlert({
                title: "Error",
                text: "Seleccioná un tipo",
                icon: "error"
            });

            return;
        }

        try {

            const res = await fetch(
                "/api/supports/update",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        id: editId,
                        name: editName.trim(),
                        type: editType,
                        is_digital: editIsDigital
                    })
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {

                showAlert({
                    title: "Error",
                    text:
                        data.error ||
                        "Error actualizando",
                    icon: "error"
                });

                return;
            }

            showAlert({
                title: "OK",
                text: "Soporte actualizado",
                icon: "success"
            });

            setEditOpen(false);

            load();

        } catch (err) {

            console.error("UPDATE SUPPORT ERROR:", err);

            showAlert({
                title: "Error",
                text: "Error interno",
                icon: "error"
            });
        }
    }

    // =========================
    // DELETE
    // =========================
    async function remove(id) {

        const confirmed = await showAlert({
            title: "¿Eliminar soporte?",
            text: "No se puede deshacer",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
        });

        if (!confirmed) return;

        try {

            const res = await fetch(
                "/api/supports/delete",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ id })
                }
            );

            const data = await res.json().catch(() => ({}));

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
                text: "Soporte eliminado",
                icon: "success"
            });

            load();

        } catch (err) {

            console.error("DELETE SUPPORT ERROR:", err);

            showAlert({
                title: "Error",
                text: "Error interno",
                icon: "error"
            });
        }
    }

    return (
        <div className="container-fluid m-0 p-1">

            <TagsHeader />

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mt-3 mb-4">

                <h1 className="tags_title">
                    🧩 Materia Prima
                </h1>

                <button
                    className="tags_btn me-3"
                    style={{ maxWidth: "220px" }}
                    onClick={() => setOpen(true)}
                >
                    ✚ Nuevo soporte
                </button>

            </div>

            {/* FILTERS */}
            <div className="row g-2 mb-3 tags_text_normal">

                {/* SEARCH */}
                <div className="col-12 col-md-4">

                    <input
                        type="text"
                        className="tags_modal_input"
                        placeholder="Buscar soporte..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                </div>

                {/* TYPE */}
                <div className="col-12 col-md-4">

                    <select
                        className="tags_modal_input"
                        value={filterType}
                        onChange={(e) =>
                            setFilterType(e.target.value)
                        }
                    >

                        <option value="">
                            Todos los tipos
                        </option>

                        {supportTypes.map((t) => (

                            <option
                                key={t}
                                value={t}
                            >
                                {t}
                            </option>

                        ))}

                    </select>

                </div>

                {/* DIGITAL */}
                <div className="col-12 col-md-4">

                    <select
                        className="tags_modal_input"
                        value={filterDigital}
                        onChange={(e) =>
                            setFilterDigital(e.target.value)
                        }
                    >

                        <option value="">
                            Todos
                        </option>

                        <option value="0">
                            Físicos
                        </option>

                        <option value="1">
                            Digitales
                        </option>

                    </select>

                </div>

            </div>

            {/* TABLE */}
            <div className="tags_table_wrapper">

                <table className="tags_table tags_text_normal">

                    <thead>

                        <tr>

                            <th>Nombre</th>

                            <th>Tipo</th>

                            <th>Modalidad</th>

                            <th className="text-center">
                                Acciones
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {filteredList.map((s) => (

                            <tr key={s.id}>

                                {/* NAME */}
                                <td>
                                    {s.name}
                                </td>

                                {/* TYPE */}
                                <td>

                                    <span className="badge active">
                                        {s.type}
                                    </span>

                                </td>

                                {/* DIGITAL */}
                                <td>

                                    <span
                                        className={`badge ${s.is_digital
                                            ? "active"
                                            : "pending"
                                            }`}
                                    >
                                        {s.is_digital
                                            ? "Digital"
                                            : "Físico"}
                                    </span>

                                </td>

                                {/* ACTIONS */}
                                <td className="text-center">

                                    <div className="tags_actions">

                                        <button
                                            className="icon_btn"
                                            onClick={() => openEdit(s)}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>

                                        <button
                                            className="icon_btn danger"
                                            onClick={() => remove(s.id)}
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

            {/* ========================= */}
            {/* CREATE MODAL */}
            {/* ========================= */}
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
                                Nuevo soporte
                            </h2>

                        </div>

                        <div className="tags_modal_body">

                            {/* TYPE */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Tipo
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={type}
                                    onChange={(e) => {

                                        const value =
                                            e.target.value;

                                        setType(value);

                                        if (!name) {
                                            setName(value);
                                        }
                                    }}
                                >

                                    <option value="">
                                        Seleccionar
                                    </option>

                                    {supportTypes.map((t) => (

                                        <option
                                            key={t}
                                            value={t}
                                        >
                                            {t}
                                        </option>

                                    ))}

                                </select>

                            </div>

                            {/* NAME */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Nombre
                                </label>

                                <input
                                    className="tags_modal_input"
                                    value={name}
                                    onChange={(e) =>
                                        setName(e.target.value)
                                    }
                                />

                            </div>

                            {/* DIGITAL */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Modalidad
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={isDigital ? "1" : "0"}
                                    onChange={(e) =>
                                        setIsDigital(
                                            e.target.value === "1"
                                        )
                                    }
                                >

                                    <option value="0">
                                        Físico
                                    </option>

                                    <option value="1">
                                        Digital
                                    </option>

                                </select>

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

            {/* ========================= */}
            {/* EDIT MODAL */}
            {/* ========================= */}
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
                                Editar soporte
                            </h2>

                        </div>

                        <div className="tags_modal_body">

                            {/* TYPE */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Tipo
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={editType}
                                    onChange={(e) =>
                                        setEditType(e.target.value)
                                    }
                                >

                                    <option value="">
                                        Seleccionar
                                    </option>

                                    {supportTypes.map((t) => (

                                        <option
                                            key={t}
                                            value={t}
                                        >
                                            {t}
                                        </option>

                                    ))}

                                </select>

                            </div>

                            {/* NAME */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Nombre
                                </label>

                                <input
                                    className="tags_modal_input"
                                    value={editName}
                                    onChange={(e) =>
                                        setEditName(e.target.value)
                                    }
                                />

                            </div>

                            {/* DIGITAL */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Modalidad
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={editIsDigital ? "1" : "0"}
                                    onChange={(e) =>
                                        setEditIsDigital(
                                            e.target.value === "1"
                                        )
                                    }
                                >

                                    <option value="0">
                                        Físico
                                    </option>

                                    <option value="1">
                                        Digital
                                    </option>

                                </select>

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