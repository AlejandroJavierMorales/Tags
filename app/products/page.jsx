"use client";

import { useEffect, useState } from "react";
import TagsHeader from "../components/Header";
import "../styles/tagsModals.css";
import showAlert from "../components/showAlert";



export default function ProductsPage() {

    const [list, setList] = useState([]);

    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const [name, setName] = useState("");
    const [isDigital, setIsDigital] = useState(false);

    const [editId, setEditId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editIsDigital, setEditIsDigital] = useState(false);

    const [qrTypes, setQrTypes] = useState([]);
    const [supports, setSupports] = useState([]);

    // CREATE
    const [qrTypeId, setQrTypeId] = useState("");
    const [supportId, setSupportId] = useState("");

    // EDIT
    const [editQrTypeId, setEditQrTypeId] = useState("");
    const [editSupportId, setEditSupportId] = useState("");

    const [editQrTypes, setEditQrTypes] = useState([]);
    const [editSupports, setEditSupports] = useState([]);
    // FILTROS
    const [search, setSearch] = useState("");
    const [filterQrType, setFilterQrType] = useState("");
    const [filterSupport, setFilterSupport] = useState("");


    useEffect(() => {
        load();
        loadMeta();
    }, []);

    async function load() {
        const res = await fetch("/api/products");
        const json = await res.json().catch(() => ({}));

        setList(Array.isArray(json.data) ? json.data : []);
    }

    async function loadMeta() {

        try {

            const [typesRes, supportsRes] = await Promise.all([
                fetch("/api/qr/types"),
                fetch("/api/supports")
            ]);

            const typesJson = await typesRes.json().catch(() => ({}));
            const supportsJson = await supportsRes.json().catch(() => ({}));

            const qrTypesData = Array.isArray(typesJson.data)
                ? typesJson.data
                : [];

            const supportsData = Array.isArray(supportsJson.data)
                ? supportsJson.data
                : [];

            // CREATE
            setQrTypes(qrTypesData);
            setSupports(supportsData);

            // EDIT
            setEditQrTypes(qrTypesData);
            setEditSupports(supportsData);

        } catch (err) {

            console.error("LOAD META ERROR:", err);

            setQrTypes([]);
            setSupports([]);

            setEditQrTypes([]);
            setEditSupports([]);
        }
    }

    const filteredList = list.filter((p) => {

        const matchSearch =
            !search ||
            p.name?.toLowerCase().includes(search.toLowerCase());

        const matchQrType =
            !filterQrType ||
            String(p.qr_type_id) === String(filterQrType);

        const matchSupport =
            !filterSupport ||
            String(p.support_id) === String(filterSupport);

        return (
            matchSearch &&
            matchQrType &&
            matchSupport
        );
    });

    // Crea el Nombre del Producto Concatenando el Support y el QR Type
    function buildProductName(supportIdValue, qrTypeIdValue) {

        const support = supports.find(
            s => String(s.id) === String(supportIdValue)
        );

        const qrType = qrTypes.find(
            q => String(q.id) === String(qrTypeIdValue)
        );

        if (!support || !qrType) return "";

        return `${support.name} - ${qrType.name}`;
    }
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

        const res = await fetch("/api/products/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name.trim(),
                is_digital: isDigital,
                qr_type_id: qrTypeId,
                support_id: supportId
            })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showAlert({
                title: "Error",
                text: data.error || "Error creando producto",
                icon: "error"
            });
            return;
        }

        showAlert({
            title: "OK",
            text: "Producto creado",
            icon: "success"
        });

        setName("");
        setIsDigital(false);
        setOpen(false);

        load();
    }

    // =========================
    // EDIT
    // =========================
    function openEdit(product) {

        console.log(product);

        setEditId(product.id);

        setEditName(product.name || "");

        setEditIsDigital(Boolean(product.is_digital));

        setEditQrTypeId(
            product.qr_type_id
                ? String(product.qr_type_id)
                : ""
        );

        setEditSupportId(
            product.support_id
                ? String(product.support_id)
                : ""
        );

        setEditOpen(true);
    }

    async function saveEdit() {

        if (!editName.trim()) {
            showAlert({
                title: "Error",
                text: "El nombre es obligatorio",
                icon: "error"
            });
            return;
        }

        if (!editQrTypeId) {
            showAlert({
                title: "Error",
                text: "Seleccioná un tipo QR",
                icon: "error"
            });
            return;
        }

        if (!editSupportId) {
            showAlert({
                title: "Error",
                text: "Seleccioná un soporte",
                icon: "error"
            });
            return;
        }

        const res = await fetch("/api/products/update", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: editId,

                name: editName.trim(),

                is_digital: editIsDigital,

                qr_type_id: editQrTypeId,

                support_id: editSupportId
            })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {

            showAlert({
                title: "Error",
                text: data.error || "Error actualizando",
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text: "Producto actualizado",
            icon: "success"
        });

        setEditOpen(false);

        load();
    }

    // =========================
    // DELETE
    // =========================
    async function remove(id) {

        const confirmed = await showAlert({
            title: "¿Eliminar producto?",
            text: "No se puede deshacer",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
        });

        if (!confirmed) return;

        const res = await fetch("/api/products/delete", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id })
        });

        const data = await res.json().catch(() => ({}));

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
            text: "Producto eliminado",
            icon: "success"
        });

        load();
    }

    return (
        <div className="container-fluid m-0 p-1">
            <TagsHeader />

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mt-3 mb-4">
                <h1 className="tags_title">🧩 Productos</h1>

                <button
                    className="tags_btn me-3"
                    style={{ maxWidth: "200px" }}
                    onClick={() => setOpen(true)}
                >
                    ✚ Nuevo producto
                </button>
            </div>

            {/* FILTROS */}
            {/* FILTERS */}
            <div className="row g-2 mb-3 tags_text_normal">

                {/* SEARCH */}
                <div className="col-12 col-md-4">

                    <input
                        type="text"
                        className="tags_modal_input"
                        placeholder="Buscar producto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                </div>

                {/* QR TYPE */}
                <div className="col-12 col-md-4">

                    <select
                        className="tags_modal_input"
                        value={filterQrType}
                        onChange={(e) => setFilterQrType(e.target.value)}
                    >

                        <option value="">
                            Todos los tipos QR
                        </option>

                        {qrTypes.map((q) => (

                            <option
                                key={q.id}
                                value={q.id}
                            >
                                {q.name}
                            </option>

                        ))}

                    </select>

                </div>

                {/* SUPPORT */}
                <div className="col-12 col-md-4">

                    <select
                        className="tags_modal_input"
                        value={filterSupport}
                        onChange={(e) => setFilterSupport(e.target.value)}
                    >

                        <option value="">
                            Todos los soportes
                        </option>

                        {supports.map((s) => (

                            <option
                                key={s.id}
                                value={s.id}
                            >
                                {s.name}
                            </option>

                        ))}

                    </select>

                </div>

            </div>

            {/* TABLE */}
            <div className="tags_table_wrapper">

                <table className="tags_table tags_text_normal">

                    <thead>
                        <tr>

                            <th>Producto</th>

                            <th>Tipo QR</th>

                            <th>Soporte</th>

                            <th className="text-center">
                                Acciones
                            </th>

                        </tr>
                    </thead>

                    <tbody>

                        {filteredList.map(p => (

                            <tr key={p.id}>

                                {/* PRODUCTO */}
                                <td>
                                    {p.name}
                                </td>

                                {/* TIPO QR */}
                                <td>

                                    <span className="badge active">

                                        {p.qr_type_name || "-"}

                                    </span>

                                </td>

                                {/* SOPORTE */}
                                <td>

                                    <span
                                        className={`badge ${p.is_digital
                                            ? "active"
                                            : "pending"
                                            }`}
                                    >

                                        {p.support_name || "-"}

                                    </span>

                                </td>

                                {/* ACTIONS */}
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
                                Nuevo producto
                            </h2>
                        </div>

                        <div className="tags_modal_body">

                            {/* QR TYPE */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">
                                    Tipo QR
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={qrTypeId}
                                    onChange={(e) => {

                                        const value = e.target.value;

                                        setQrTypeId(value);

                                        const generated = buildProductName(
                                            supportId,
                                            value
                                        );

                                        if (generated) {
                                            setName(generated);
                                        }
                                    }}
                                >
                                    <option value="">Seleccionar</option>

                                    {qrTypes.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* SUPPORT */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">
                                    Soporte
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={supportId}
                                    onChange={(e) => {

                                        const value = e.target.value;

                                        setSupportId(value);

                                        const generated = buildProductName(
                                            value,
                                            qrTypeId
                                        );

                                        if (generated) {
                                            setName(generated);
                                        }

                                        const support = supports.find(
                                            s => String(s.id) === String(value)
                                        );

                                        setIsDigital(Boolean(support?.is_digital));
                                    }}
                                >
                                    <option value="">Seleccionar</option>

                                    {supports.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
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
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            {/* DIGITAL */}
                            <div className="tags_modal_group">
                                <label className="tags_modal_label">
                                    Tipo
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={isDigital ? "1" : "0"}
                                    onChange={(e) =>
                                        setIsDigital(e.target.value === "1")
                                    }
                                >
                                    <option value="0">Físico</option>
                                    <option value="1">Digital</option>
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

            {/* // =========================
            // EDIT MODAL
            // ========================= */}

            {
                editOpen && (
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
                                    Editar producto
                                </h2>

                            </div>

                            <div className="tags_modal_body">

                                {/* QR TYPE */}
                                <div className="tags_modal_group">

                                    <label className="tags_modal_label">
                                        Tipo de QR
                                    </label>

                                    <select
                                        className="tags_modal_input"
                                        value={editQrTypeId}
                                        onChange={(e) => {

                                            const value = e.target.value;

                                            setEditQrTypeId(value);

                                            const autoName = buildProductName(
                                                editSupportId,
                                                value
                                            );

                                            if (autoName) {
                                                setEditName(autoName);
                                            }
                                        }}
                                    >

                                        <option value="">
                                            Seleccionar
                                        </option>

                                        {editQrTypes.map(q => (

                                            <option
                                                key={q.id}
                                                value={q.id}
                                            >
                                                {q.name}
                                            </option>

                                        ))}

                                    </select>

                                </div>

                                {/* SUPPORT */}
                                <div className="tags_modal_group">

                                    <label className="tags_modal_label">
                                        Soporte
                                    </label>

                                    <select
                                        className="tags_modal_input"
                                        value={editSupportId}
                                        onChange={(e) => {

                                            const value = e.target.value;

                                            setEditSupportId(value);

                                            const support = editSupports.find(
                                                s => String(s.id) === String(value)
                                            );

                                            // auto digital
                                            if (support) {
                                                setEditIsDigital(
                                                    Boolean(support.is_digital)
                                                );
                                            }

                                            const autoName = buildProductName(
                                                value,
                                                editQrTypeId
                                            );

                                            if (autoName) {
                                                setEditName(autoName);
                                            }
                                        }}
                                    >

                                        <option value="">
                                            Seleccionar
                                        </option>

                                        {editSupports.map(s => (

                                            <option
                                                key={s.id}
                                                value={s.id}
                                            >
                                                {s.name}
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
                                        onChange={(e) => setEditName(e.target.value)}
                                    />

                                </div>

                                {/* DIGITAL */}
                                <div className="tags_modal_group">

                                    <label className="tags_modal_label">
                                        Tipo
                                    </label>

                                    <select
                                        className="tags_modal_input"
                                        value={editIsDigital ? "1" : "0"}
                                        onChange={(e) =>
                                            setEditIsDigital(e.target.value === "1")
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
                )
            }
        </div>
    );
}