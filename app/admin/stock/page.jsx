"use client";

import { useEffect, useState } from "react";
import "../../styles/tagsModals.css";
import TagsHeader from "../../components/Header";

export default function StockPage() {

    // =====================================
    // STATES
    // =====================================

    const [list, setList] = useState([]);

    const [filters, setFilters] = useState({
        product: "",
        status: ""
    });

    const [kpis, setKpis] = useState({
        products: 0,
        ok: 0,
        negative: 0,
        digital: 0
    });

    // =====================================
    // LOAD
    // =====================================

    useEffect(() => {

        load();

    }, [filters]);

    async function load() {

        const params =
            new URLSearchParams();

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
            `/api/stock/get?${params.toString()}`,
            {
                cache: "no-store"
            }
        );

        const data =
            await res.json();

        const rows =
            data.products || [];

        setList(rows);

        // =====================================
        // KPIS
        // =====================================

        setKpis({

            products:
                rows.length,

            ok:
                rows.filter(
                    r =>
                        r.real_stock > 0
                        && !r.is_digital
                ).length,

            negative:
                rows.filter(
                    r =>
                        r.real_stock <= 0
                        && !r.is_digital
                ).length,

            digital:
                rows.filter(
                    r =>
                        r.is_digital
                ).length
        });
    }

    // =====================================
    // BADGES
    // =====================================

    function stockBadge(row) {

        if (row.is_digital) {

            return (
                <span className="badge active">
                    Digital
                </span>
            );
        }

        if (row.real_stock <= 0) {

            return (
                <span className="badge danger">
                    Sin stock
                </span>
            );
        }

        return (
            <span className="badge success">
                OK
            </span>
        );
    }

    // =====================================
    // UI
    // =====================================

    return (
        <div className="container-fluid tags_container m-0 p-0">

            <TagsHeader />

            <div className="p-3">

                {/* ===================================== */}
                {/* HEADER */}
                {/* ===================================== */}

                <div className="d-flex justify-content-between align-items-center mb-3">

                    <h2 className="tags_title">
                        📦 Stock
                    </h2>

                </div>

                {/* ===================================== */}
                {/* KPIS */}
                {/* ===================================== */}

                <div className="row g-3 mb-4">

                    <div className="col-md-3">

                        <div className="tags_card p-3">

                            <div className="tags_text_muted">
                                Productos
                            </div>

                            <div className="tags_title">
                                {kpis.products}
                            </div>

                        </div>

                    </div>

                    <div className="col-md-3">

                        <div className="tags_card p-3">

                            <div className="tags_text_muted">
                                Con stock
                            </div>

                            <div className="tags_title">
                                {kpis.ok}
                            </div>

                        </div>

                    </div>

                    <div className="col-md-3">

                        <div className="tags_card p-3">

                            <div className="tags_text_muted">
                                Sin stock
                            </div>

                            <div className="tags_title">
                                {kpis.negative}
                            </div>

                        </div>

                    </div>

                    <div className="col-md-3">

                        <div className="tags_card p-3">

                            <div className="tags_text_muted">
                                Digitales
                            </div>

                            <div className="tags_title">
                                {kpis.digital}
                            </div>

                        </div>

                    </div>

                </div>

                {/* ===================================== */}
                {/* FILTERS */}
                {/* ===================================== */}

                <div className="row g-2 mb-3">

                    <div className="col-md-4">

                        <input
                            className="tags_modal_input"
                            placeholder="Producto"
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

                    <div className="col-md-3">

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
                                Todos
                            </option>

                            <option value="ok">
                                Con stock
                            </option>

                            <option value="negative">
                                Sin stock
                            </option>

                            <option value="digital">
                                Digital
                            </option>

                        </select>

                    </div>

                </div>

                {/* ===================================== */}
                {/* TABLE */}
                {/* ===================================== */}

                <div className="tags_table_wrapper">

                    <table className="tags_table tags_text_normal">

                        <thead>

                            <tr>

                                <th>Producto</th>

                                <th>Stock</th>

                                <th>Vendidos</th>

                                <th>Disponibles</th>

                                <th>Generated</th>

                                <th>Stock real</th>

                                <th>Estado</th>

                            </tr>

                        </thead>

                        <tbody>

                            {list.map((row) => (

                                <tr key={row.id}>

                                    <td>
                                        {row.name}
                                    </td>

                                    <td>
                                        {row.stock}
                                    </td>

                                    <td>
                                        {row.assigned}
                                    </td>

                                    <td>
                                        {row.available}
                                    </td>

                                    <td>
                                        {row.generated}
                                    </td>

                                    <td>

                                        {row.real_stock <= 0 ? (

                                            <span className="badge danger">
                                                {row.real_stock}
                                            </span>

                                        ) : (

                                            <span className="badge success">
                                                {row.real_stock}
                                            </span>

                                        )}

                                    </td>

                                    <td>
                                        {stockBadge(row)}
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