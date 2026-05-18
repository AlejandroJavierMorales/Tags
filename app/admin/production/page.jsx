"use client";

import { useEffect, useState } from "react";
import "../../styles/tagsModals.css";
import TagsHeader from "../../components/Header";
import showAlert from "@/app/components/showAlert";

export default function ProductionPage() {
    const [list, setList] = useState([]);
    const [filters, setFilters] = useState({
        business: "",
        qr: "",
        order_id: "",
        status: ""
    });

    const [editData, setEditData] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editBusinessId, setEditBusinessId] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [editQuantity, setEditQuantity] = useState(1);
    const [businesses, setBusinesses] = useState([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [createProductId, setCreateProductId] = useState("");
    const [createBusinessId, setCreateBusinessId] = useState("");
    const [createQuantity, setCreateQuantity] = useState(1);
    const [createNotes, setCreateNotes] = useState("");

    const [generatedQrs, setGeneratedQrs] = useState([]);
    const [selectedQrs, setSelectedQrs] = useState([]);


    useEffect(() => {
        load();
        loadBusinesses();
        loadProducts();
    }, [filters]);

    useEffect(() => {

        if (!createProductId) {

            setGeneratedQrs([]);
            return;
        }

        fetch(
            `/api/qr/generated?product_id=${createProductId}`
        )
            .then(r => r.json())
            .then(data => {

                setGeneratedQrs(
                    data.data || []
                );

            })
            .catch(() => {

                setGeneratedQrs([]);
            });

    }, [createProductId]);

    async function load() {

        const params =
            new URLSearchParams();

        if (filters.business) {
            params.append(
                "business",
                filters.business
            );
        }

        if (filters.qr) {
            params.append(
                "qr",
                filters.qr
            );
        }

        if (filters.order_id) {
            params.append(
                "order_id",
                filters.order_id
            );
        }

        if (filters.status) {
            params.append(
                "status",
                filters.status
            );
        }

        const res = await fetch(
            `/api/production/get?${params.toString()}`,
            {
                cache: "no-store"
            }
        );

        const data = await res.json();

        setList(data.data || []);
    }


    async function loadProducts() {

        const res = await fetch(
            "/api/products"
        );

        const data = await res.json();

        setProducts(data.data || []);
    }

    async function loadBusinesses() {

        try {

            const res =
                await fetch("/api/business/list");

            const data =
                await res.json();

            setBusinesses(Array.isArray(data) ? data : []);

        } catch (err) {

            console.log(err);
        }
    }

    function openEdit(row) {

        setEditId(row.id);

        setEditBusinessId(
            row.business_id || ""
        );

        setEditNotes(
            row.notes || ""
        );

        setEditQuantity(
            row.quantity || 1
        );

        setEditOpen(true);
    }


    async function saveEdit() {

        try {

            const res = await fetch(
                "/api/production/update",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        id: editId,
                        business_id: editBusinessId || null,
                        notes: editNotes,
                        quantity: Number(editQuantity)
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
                        "No se pudo actualizar",
                    icon: "error"
                });

                return;
            }

            showAlert({
                title: "OK",
                text:
                    "Orden actualizada",
                icon: "success"
            });

            setEditOpen(false);

            load();

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "Error interno",
                icon: "error"
            });
        }
    }

    async function createOrder() {

        const res = await fetch(
            "/api/production/create",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    product_id: Number(createProductId),

                    business_id:
                        createBusinessId
                            ? Number(createBusinessId)
                            : null,

                    selected_qrs: selectedQrs,

                    notes: createNotes
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
                    "No se pudo crear",
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text:
                "Orden creada correctamente",
            icon: "success"
        });

        setCreateOpen(false);

        setCreateProductId("");
        setCreateBusinessId("");
        setCreateQuantity(1);
        setCreateNotes("");

        load();
    }



    async function updateStatus(id, status) {

        let confirmed = true;

        // =========================
        // ⚠️ CONFIRMACIONES
        // =========================

        if (status === "in_progress") {
            confirmed = await showAlert({
                title: "Pasar a producción",
                text: "La orden pasará a estado 'En proceso'",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, continuar",
                cancelButtonText: "Cancelar"
            });
        }

        if (status === "done") {
            confirmed = await showAlert({
                title: "Finalizar orden",
                text: "Se sumará el stock producido automáticamente. ¿Continuar?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, finalizar",
                cancelButtonText: "Cancelar"
            });
        }

        if (!confirmed) return;

        // =========================
        // 🚀 REQUEST
        // =========================

        const res = await fetch("/api/production/status", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id, status })
        });

        const data = await res.json().catch(() => ({}));

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
            text: "Estado actualizado correctamente",
            icon: "success"
        });

        load();
    }

    function badge(status) {
        switch (status) {
            case "pending":
                return "badge pending";
            case "in_progress":
                return "badge active";
            case "done":
                return "badge active";
            default:
                return "badge";
        }
    }

    return (
        <div className="container-fluid tags_container m-0 p-0">
            <TagsHeader />

            <div className="p-3">

                <div className="d-flex justify-content-between align-items-center mb-3">

                    <h2 className="tags_title">
                        🏭 Producción
                    </h2>

                    <button
                        className="tags_btn rounded ms-4 tags_text_normal"
                        style={{maxWidth:"150px"}}
                        onClick={() =>
                            setCreateOpen(true)
                        }
                    >
                         ✚ Nueva Orden
                    </button>

                </div>

                <div className="row g-2 mb-3">

                    <div className="col-md-3">

                        <input
                            className="tags_modal_input"
                            placeholder="Cliente"
                            value={filters.business}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    business: e.target.value
                                }))
                            }
                        />

                    </div>

                    <div className="col-md-2">

                        <input
                            className="tags_modal_input"
                            placeholder="QR"
                            value={filters.qr}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    qr: e.target.value
                                }))
                            }
                        />

                    </div>

                    <div className="col-md-2">

                        <input
                            className="tags_modal_input"
                            placeholder="Orden"
                            value={filters.order_id}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    order_id: e.target.value
                                }))
                            }
                        />

                    </div>

                    <div className="col-md-2">

                        <select
                            className="tags_modal_input"
                            value={filters.status}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    status: e.target.value
                                }))
                            }
                        >

                            <option value="">
                                Todos
                            </option>

                            <option value="pending">
                                pending
                            </option>

                            <option value="in_progress">
                                in_progress
                            </option>

                            <option value="done">
                                done
                            </option>

                        </select>

                    </div>

                </div>

                <div className="tags_table_wrapper">

                    <table className="tags_table tags_text_normal">

                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Cliente</th>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                                <th>Acciones</th>
                                <th>Notas</th>
                            </tr>
                        </thead>

                        <tbody>
                            {list.map((row) => (
                                <tr key={row.id}>

                                    <td>{row.id}</td>

                                    <td>
                                        {row.business_name || "-"}
                                    </td>

                                    <td>{row.product_name}</td>

                                    <td>{row.quantity}</td>

                                    <td>
                                        <span className={badge(row.status)}>
                                            {row.status}
                                        </span>
                                    </td>

                                    <td>{row.created_at}</td>

                                    <td>
                                        <div className="actions d-flex gap-2">

                                            <button
                                                className="icon_btn"
                                                title="Editar"
                                                onClick={() => openEdit(row)}
                                            >
                                                ✏️
                                            </button>
                                            {row.status === "pending" && (
                                                <button
                                                    className="icon_btn primary"
                                                    title="En Proceso"
                                                    onClick={() => updateStatus(row.id, "in_progress")}
                                                >
                                                    ▶️
                                                </button>
                                            )}

                                            {row.status !== "done" && (
                                                <button
                                                    className="icon_btn success"
                                                    title="cumplir Orden"
                                                    onClick={() => updateStatus(row.id, "done")} //deberia sumar lo que produce la orden al stock
                                                >
                                                    ✅
                                                </button>
                                            )}

                                        </div>
                                    </td>

                                    <td>
                                        {row.notes || "-"}
                                    </td>

                                </tr>
                            ))}
                        </tbody>

                    </table>

                </div>

            </div>

            {/* ===================================== */}
            {/* EDIT PRODUCTION MODAL */}
            {/* ===================================== */}

            {editOpen && (

                <div className="tags_modal_overlay tags_text_normal">

                    <div className="tags_modal_card">

                        <button
                            className="tags_modal_close"
                            onClick={() =>
                                setEditOpen(false)
                            }
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header text-center">

                            <h2 className="tags_modal_title tags_title">
                                Editar orden
                            </h2>

                            <p className="tags_modal_description">
                                Actualizá los datos de producción
                            </p>

                        </div>

                        <div className="tags_modal_body">

                            {/* CLIENTE */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Cliente
                                </label>

                                <select
                                    className="tags_modal_input tags_text_normal"
                                    value={editBusinessId}
                                    onChange={(e) =>
                                        setEditBusinessId(
                                            e.target.value
                                        )
                                    }
                                >

                                    <option value="">
                                        Sin cliente
                                    </option>

                                    {businesses.map((b) => (

                                        <option
                                            key={b.id}
                                            value={b.id}
                                        >
                                            {b.name}
                                        </option>

                                    ))}

                                </select>

                            </div>

                            {/* CANTIDAD */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Cantidad
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    className="tags_modal_input tags_text_normal"
                                    value={editQuantity}
                                    onChange={(e) =>
                                        setEditQuantity(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                            {/* NOTES */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Notas
                                </label>

                                <textarea
                                    className="tags_modal_input tags_text_normal"
                                    rows={4}
                                    value={editNotes}
                                    onChange={(e) =>
                                        setEditNotes(
                                            e.target.value
                                        )
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
                                onClick={() =>
                                    setEditOpen(false)
                                }
                            >
                                ✖ Cancelar
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* ===================================== */}
            {/* CREATE PRODUCTION MODAL */}
            {/* ===================================== */}
            {createOpen && (

                <div className="tags_modal_overlay tags_text_normal">

                    <div className="tags_modal_card">

                        <button
                            className="tags_modal_close"
                            onClick={() =>
                                setCreateOpen(false)
                            }
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header text-center">

                            <h2 className="tags_modal_title tags_title">
                                Nueva Orden
                            </h2>

                            <p className="tags_modal_description">
                                Crear orden de producción
                            </p>

                        </div>

                        <div className="tags_modal_body">

                            {/* PRODUCT */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Producto
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={createProductId}
                                    onChange={(e) => {

                                        setCreateProductId(
                                            e.target.value
                                        );

                                        // reset
                                        setSelectedQrs([]);
                                    }}
                                >

                                    <option value="">
                                        Seleccionar
                                    </option>

                                    {products.map((p) => (

                                        <option
                                            key={p.id}
                                            value={p.id}
                                        >
                                            {p.name}
                                        </option>

                                    ))}

                                </select>

                            </div>

                            {/* DESTINO */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Destino
                                </label>

                                <select
                                    className="tags_modal_input"
                                    value={createBusinessId}
                                    onChange={(e) =>
                                        setCreateBusinessId(
                                            e.target.value
                                        )
                                    }
                                >

                                    <option value="">
                                        📦 Stock
                                    </option>

                                    {businesses.map((b) => (

                                        <option
                                            key={b.id}
                                            value={b.id}
                                        >
                                            👤 {b.name}
                                        </option>

                                    ))}

                                </select>

                            </div>

                            {/* GENERATED QRS */}
                            {createProductId && (

                                <div className="tags_modal_group">

                                    <label className="tags_modal_label">
                                        QRs Generated
                                    </label>

                                    <div
                                        style={{
                                            maxHeight: 220,
                                            overflowY: "auto",
                                            border: "1px solid #2d3748",
                                            borderRadius: 10,
                                            padding: 12,
                                            background: "#f1f2f5"
                                        }}
                                    >

                                        {generatedQrs.length === 0 && (

                                            <p
                                                style={{
                                                    margin: 0,
                                                    opacity: 0.7
                                                }}
                                            >
                                                No hay QRs generated
                                            </p>

                                        )}

                                        {generatedQrs.map((qr) => {

                                            const checked =
                                                selectedQrs.includes(qr.id);

                                            return (

                                                <label
                                                    key={qr.id}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 10,
                                                        marginBottom: 10,
                                                        cursor: "pointer"
                                                    }}
                                                >

                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(e) => {

                                                            if (e.target.checked) {

                                                                setSelectedQrs(prev => [
                                                                    ...prev,
                                                                    qr.id
                                                                ]);

                                                            } else {

                                                                setSelectedQrs(prev =>
                                                                    prev.filter(
                                                                        x => x !== qr.id
                                                                    )
                                                                );
                                                            }
                                                        }}
                                                    />

                                                    <span>

                                                        <b>
                                                            {qr.code}
                                                        </b>

                                                        {qr.label
                                                            ? ` — ${qr.label}`
                                                            : ""}

                                                    </span>

                                                </label>
                                            );
                                        })}

                                    </div>

                                </div>
                            )}

                            {/* CANTIDAD */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Cantidad seleccionada
                                </label>

                                <input
                                    type="text"
                                    className="tags_modal_input"
                                    value={selectedQrs.length}
                                    readOnly
                                />

                            </div>

                            {/* NOTES */}
                            <div className="tags_modal_group">

                                <label className="tags_modal_label">
                                    Notas
                                </label>

                                <textarea
                                    className="tags_modal_input"
                                    rows={4}
                                    value={createNotes}
                                    onChange={(e) =>
                                        setCreateNotes(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                        </div>

                        <div className="tags_modal_actions">

                            <button
                                className="tags_modal_btn tags_modal_btn_success"
                                onClick={createOrder}
                                disabled={
                                    !createProductId
                                    || selectedQrs.length === 0
                                }
                            >
                                🖫 Crear
                            </button>

                            <button
                                className="tags_modal_btn tags_modal_btn_cancel"
                                onClick={() =>
                                    setCreateOpen(false)
                                }
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