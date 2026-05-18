"use client";

import { useEffect, useState } from "react";
import TagsHeader from "../../components/Header";
import "../../styles/tagsModals.css";
import showAlert from "@/app/components/showAlert";

export default function QrTypesPage() {
    const [types, setTypes] = useState([]);
    const [modal, setModal] = useState(null);

    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [urlPrefix, setUrlPrefix] = useState("");

    // -----------------------------
    // LOAD
    // -----------------------------
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        load();
    }, []);

    async function load() {
        const res = await fetch("/api/qr/types");
        const data = await res.json();
        setTypes(data.data || []);
    }

    // -----------------------------
    // CREATE / UPDATE
    // -----------------------------
    async function saveType() {
        const res = await fetch("/api/qr/types", {
            method: modal?.id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: modal?.id,
                name,
                code,
                url_prefix: urlPrefix
            })
        });

        const data = await res.json();

        if (!res.ok) {
            showAlert({ title: "Error", text: data.error, icon: "error" });
            return;
        }

        showAlert({ title: "OK", text: "Guardado", icon: "success" });

        setModal(null);
        setName("");
        setCode("");
        setUrlPrefix("");
        load();
    }

    // -----------------------------
    // DELETE
    // -----------------------------
    async function deleteType(id) {
        const confirm = await showAlert({
            title: "Eliminar tipo?",
            text: "Esto puede afectar QRs existentes",
            icon: "warning",
            showCancelButton: true
        });

        if (!confirm) return;

        const res = await fetch("/api/qr/types", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        });

        const data = await res.json();

        if (!res.ok) {
            showAlert({
                title: "No se puede eliminar",
                text: data.error || "Error",
                icon: "error"
            });
            return;
        }

        showAlert({
            title: "OK",
            text: "Tipo eliminado correctamente",
            icon: "success"
        });

        load();
    }

    // -----------------------------
    // EDIT
    // -----------------------------
    function openEdit(type) {
        setModal(type);
        setName(type.name);
        setCode(type.code);
        setUrlPrefix(type.url_prefix || "");
    }

    function openCreate() {
        setModal({ id: null });
        setName("");
        setCode("");
        setUrlPrefix("");
    }

    return (
        <div className="container-fluid tags_container m-0 p-1 tags_text_normal">
            <TagsHeader />
            {/* HEADER */}
            <div className="tags_filters mt-3">
                <h2 className="tags_title mt-3 me-2" >Tipos de QR</h2>

                <button className="tags_btn rounded ms-2 " onClick={openCreate} style={{ maxWidth: "150px" }}>
                    ✚ Nuevo
                </button>

            </div>

            {/* GRID */}
            <div className="tags_table_wrapper mb-5 pb-5">

                <table className="tags_table tags_text_normal">

                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Code</th>
                            <th>URL Prefix</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {types.map(type => (
                            <tr key={type.id}>

                                {/* NAME */}
                                <td>
                                    <strong>{type.name}</strong>
                                </td>

                                {/* CODE */}
                                <td>{type.code}</td>

                                {/* PREFIX */}
                                <td>{type.url_prefix || "-"}</td>

                                {/* ACTIONS */}
                                <td>
                                    <div className="actions d-flex align-items-center justify-content-center gap-2">

                                        <button
                                            className="icon_btn success"
                                            onClick={() => openEdit(type)}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>

                                        <button
                                            className="icon_btn danger"
                                            onClick={() => deleteType(type.id)}
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

            {/* MODAL */}
            {modal && (

                <div className="tags_modal_overlay">

                    <div className="tags_modal_card">

                        {/* CLOSE */}
                        <button
                            className="tags_modal_close"
                            onClick={() => setModal(null)}
                        >
                            ✕
                        </button>

                        {/* HEADER */}
                        <div className="tags_modal_header text-center">

                            <h2 className="tags_modal_title">
                                {modal.id ? "Editar Tipo" : "Nuevo Tipo"}
                            </h2>

                            <p className="tags_modal_description">
                                Configurá los datos del tipo de QR
                            </p>

                        </div>

                        {/* BODY */}
                        <div className="tags_modal_body">

                            {/* NOMBRE */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Nombre
                                </label>

                                <input
                                    className="tags_modal_input"
                                    placeholder="Nombre"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />

                            </div>

                            {/* CODE */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Code
                                </label>

                                <input
                                    className="tags_modal_input"
                                    placeholder="Ej: whatsapp"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                />

                            </div>

                            {/* URL PREFIX */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    URL Prefix
                                </label>

                                <input
                                    className="tags_modal_input"
                                    placeholder="Opcional"
                                    value={urlPrefix}
                                    onChange={(e) => setUrlPrefix(e.target.value)}
                                />

                            </div>

                        </div>

                        {/* ACTIONS */}
                        <div className="tags_modal_actions">

                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={saveType}
                            >
                              🖫 Guardar
                            </button>

                            <button
                                className="tags_modal_btn tags_modal_btn_cancel"
                                onClick={() => setModal(null)}
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