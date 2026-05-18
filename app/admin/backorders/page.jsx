"use client";

import { useEffect, useState } from "react";

import "../../styles/tagsModals.css";

import TagsHeader from "../../components/Header";

import showAlert from "@/app/components/showAlert";

export default function BackordersPage() {

    // =====================================
    // STATES
    // =====================================

    const [list, setList] = useState([]);

    const [stats, setStats] = useState({
        pending: 0,
        without_op: 0,
        in_production: 0
    });

    const [filters, setFilters] = useState({
        business: "",
        product: "",
        status: ""
    });

    const [loading, setLoading] =
        useState(false);

    // =====================================
    // LOAD
    // =====================================

    useEffect(() => {

        load();

    }, [filters]);

    async function load() {

        try {

            setLoading(true);

            const params =
                new URLSearchParams();

            if (filters.business) {

                params.append(
                    "business",
                    filters.business
                );
            }

            if (filters.product) {

                params.append(
                    "product",
                    filters.product
                );
            }

            if (filters.status) {

                params.append(
                    "status",
                    filters.status
                );
            }

            const res = await fetch(
                `/api/sales/backorders?${params.toString()}`,
                {
                    cache: "no-store"
                }
            );

            const data =
                await res.json();

            const rows =
                data.data || [];

            setList(rows);

            // =====================================
            // KPIS
            // =====================================

            const pending =
                rows.reduce(
                    (acc, row) =>
                        acc + Number(row.pending_quantity || 0),
                    0
                );

            const withoutOp =
                rows.filter(
                    row =>
                        !row.production_id
                ).length;

            const inProduction =
                rows.filter(
                    row =>
                        row.production_status === "in_progress"
                ).length;

            setStats({
                pending,
                without_op: withoutOp,
                in_production: inProduction
            });

        } catch (err) {

            console.log(err);

            showAlert({
                title: "Error",
                text: "No se pudieron cargar los backorders",
                icon: "error"
            });

        } finally {

            setLoading(false);
        }
    }

    // =====================================
    // BADGES
    // =====================================

    function saleBadge(status) {

        switch (status) {

            case "pending":
                return "badge pending";

            case "partial":
                return "badge active";

            case "completed":
                return "badge active";
            
            case "done":
                return "badge active";

            default:
                return "badge";
        }
    }

    function productionBadge(status) {

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

    // =====================================
    // FULFILL
    // =====================================

    async function fulfill(
        saleItemId
    ) {

        const confirmed =
            await showAlert({
                title: "Cumplir venta",
                text:
                    "Se intentarán asignar QR disponibles automáticamente",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Continuar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) {
            return;
        }

        try {

            const res =
                await fetch(
                    "/api/sales/fulfill",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            sale_item_id:
                                saleItemId
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
                        "No se pudo completar",
                    icon: "error"
                });

                return;
            }

            showAlert({
                title: "OK",
                text:
                    `Se asignaron ${data.assigned} QR`,
                icon: "success"
            });

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

    // =====================================
    // UI
    // =====================================

    return (
        <div className="container-fluid tags_container m-0 p-0" >

            <TagsHeader />

            <div className="p-3">

                {/* ===================================== */}
                {/* HEADER */}
                {/* ===================================== */}

                <div className="d-flex justify-content-between align-items-center mb-4">

                    <div>

                        <h2 className="tags_title mb-1">
                            📦 Backorders
                        </h2>

                        <div
                            className="tags_text_normal"
                            style={{
                                opacity: 0.7
                            }}
                        >
                            Ventas pendientes de entrega
                        </div>

                    </div>

                   {/*  <button
                        className="tags_btn"
                        onClick={load}
                    >
                        ↻ Actualizar
                    </button> */}

                </div>

                {/* ===================================== */}
                {/* KPIS */}
                {/* ===================================== */}

                <div className="row g-3 mb-4">

                    {/* PENDIENTES */}

                    <div className="col-md-4">

                        <div
                            className="p-4 rounded-4"
                            style={{
                                background: "#fff",
                                border: "1px solid #dfe3ea",
                                boxShadow:
                                    "0 2px 10px rgba(0,0,0,0.04)"
                            }}
                        >

                            <div
                                className="tags_text_normal mb-2"
                                style={{
                                    opacity: 0.7
                                }}
                            >
                                QR Pendientes
                            </div>

                            <div
                                className="tags_title"
                                style={{
                                    fontSize: 34,
                                    lineHeight: 1
                                }}
                            >
                                {stats.pending}
                            </div>

                        </div>

                    </div>

                    {/* SIN OP */}

                    <div className="col-md-4">

                        <div
                            className="p-4 rounded-4"
                            style={{
                                background: "#fff",
                                border: "1px solid #dfe3ea",
                                boxShadow:
                                    "0 2px 10px rgba(0,0,0,0.04)"
                            }}
                        >

                            <div
                                className="tags_text_normal mb-2"
                                style={{
                                    opacity: 0.7
                                }}
                            >
                                Sin Orden de Producción
                            </div>

                            <div
                                className="tags_title"
                                style={{
                                    fontSize: 34,
                                    lineHeight: 1
                                }}
                            >
                                {stats.without_op}
                            </div>

                        </div>

                    </div>

                    {/* EN PRODUCCION */}

                    <div className="col-md-4">

                        <div
                            className="p-4 rounded-4"
                            style={{
                                background: "#fff",
                                border: "1px solid #dfe3ea",
                                boxShadow:
                                    "0 2px 10px rgba(0,0,0,0.04)"
                            }}
                        >

                            <div
                                className="tags_text_normal mb-2"
                                style={{
                                    opacity: 0.7
                                }}
                            >
                                En Producción
                            </div>

                            <div
                                className="tags_title"
                                style={{
                                    fontSize: 34,
                                    lineHeight: 1
                                }}
                            >
                                {stats.in_production}
                            </div>

                        </div>

                    </div>

                </div>

                {/* ===================================== */}
                {/* FILTERS */}
                {/* ===================================== */}

                <div
                    className="p-3 rounded-4 mb-4"
                    style={{
                        background: "#fff",
                        border: "1px solid #dfe3ea"
                    }}
                >

                    <div className="row g-3">

                        {/* CLIENTE */}

                        <div className="col-md-4">

                            <div
                                className="tags_text_normal mb-2"
                                style={{
                                    fontSize: 13,
                                    opacity: 0.7
                                }}
                            >
                                Cliente
                            </div>

                            <input
                                className="tags_modal_input"
                                placeholder="Buscar cliente..."
                                value={filters.business}
                                onChange={(e) =>
                                    setFilters(prev => ({
                                        ...prev,
                                        business:
                                            e.target.value
                                    }))
                                }
                            />

                        </div>

                        {/* PRODUCTO */}

                        <div className="col-md-4">

                            <div
                                className="tags_text_normal mb-2"
                                style={{
                                    fontSize: 13,
                                    opacity: 0.7
                                }}
                            >
                                Producto
                            </div>

                            <input
                                className="tags_modal_input"
                                placeholder="Buscar producto..."
                                value={filters.product}
                                onChange={(e) =>
                                    setFilters(prev => ({
                                        ...prev,
                                        product:
                                            e.target.value
                                    }))
                                }
                            />

                        </div>

                        {/* ESTADO */}

                        <div className="col-md-4">

                            <div
                                className="tags_text_normal mb-2"
                                style={{
                                    fontSize: 13,
                                    opacity: 0.7
                                }}
                            >
                                Estado OP
                            </div>

                            <select
                                className="tags_modal_input"
                                value={filters.status}
                                onChange={(e) =>
                                    setFilters(prev => ({
                                        ...prev,
                                        status:
                                            e.target.value
                                    }))
                                }
                            >

                                <option value="">
                                    Todas
                                </option>

                                <option value="pending">
                                    Pendientes
                                </option>

                                <option value="in_progress">
                                    En Progreso
                                </option>

                                <option value="done">
                                    Cumplidas
                                </option>

                            </select>

                        </div>

                    </div>

                </div>

                {/* ===================================== */}
                {/* TABLE */}
                {/* ===================================== */}

                <div className="tags_table_wrapper" style={{marginBottom:"150px"}}>

                    <table className="tags_table tags_text_normal">

                        <thead>

                            <tr>

                                <th>Venta</th>

                                <th>Cliente</th>

                                <th>Producto</th>

                                <th>Vendidos</th>

                                <th>Entregados</th>

                                <th>Faltan</th>

                                <th>Estado Venta</th>

                                <th>OP</th>

                                <th>Estado OP</th>

                                <th>Acciones</th>

                            </tr>

                        </thead>

                        <tbody>

                            {loading && (

                                <tr>

                                    <td
                                        colSpan="10"
                                        style={{
                                            textAlign: "center",
                                            padding: 40
                                        }}
                                    >
                                        Cargando...
                                    </td>

                                </tr>
                            )}

                            {!loading &&
                                list.length === 0 && (

                                <tr>

                                    <td
                                        colSpan="10"
                                        style={{
                                            textAlign: "center",
                                            padding: 40,
                                            opacity: 0.7
                                        }}
                                    >
                                        No hay backorders
                                    </td>

                                </tr>
                            )}

                            {!loading &&
                                list.map((row) => (

                                <tr key={row.sale_item_id}>

                                    <td>
                                        <strong>
                                            #{row.sale_id}
                                        </strong>
                                    </td>

                                    <td>
                                        {row.business_name}
                                    </td>

                                    <td>
                                        {row.product_name}
                                    </td>

                                    <td>
                                        {row.quantity}
                                    </td>

                                    <td>
                                        {row.delivered_quantity}
                                    </td>

                                    <td>

                                        <span
                                            className="badge pending"
                                        >
                                            {row.pending_quantity}
                                        </span>

                                    </td>

                                    <td>

                                        <span
                                            className={
                                                saleBadge(
                                                    row.sale_status
                                                )
                                            }
                                        >

                                            {row.sale_status}

                                        </span>

                                    </td>

                                    <td>

                                        {row.production_id
                                            ? (
                                                <strong>
                                                    #{row.production_id}
                                                </strong>
                                            )
                                            : (
                                                <span
                                                    style={{
                                                        opacity: 0.5
                                                    }}
                                                >
                                                    -
                                                </span>
                                            )}

                                    </td>

                                    <td>

                                        {row.production_status ? (

                                            <span
                                                className={
                                                    productionBadge(
                                                        row.production_status
                                                    )
                                                }
                                            >

                                                {row.production_status}

                                            </span>

                                        ) : (

                                            <span
                                                className="badge disabled"
                                            >
                                                sin OP
                                            </span>
                                        )}

                                    </td>

                                    <td>

                                        <button
                                            className="tags_btn"
                                            onClick={() =>
                                                fulfill(
                                                    row.sale_item_id
                                                )
                                            }
                                        >
                                            ⚡ Cumplir
                                        </button>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );
}