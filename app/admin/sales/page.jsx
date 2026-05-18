"use client";

import { useEffect, useState } from "react";

import "../../styles/tagsModals.css";

import TagsHeader from "../../components/Header";

import showAlert from "@/app/components/showAlert";

export default function SalesPage() {

    const [list, setList] =
        useState([]);

    const [products, setProducts] =
        useState([]);

    const [businesses, setBusinesses] =
        useState([]);

    const [createOpen, setCreateOpen] =
        useState(false);

    const [createBusinessId,
        setCreateBusinessId] =
        useState("");

    const [createNotes,
        setCreateNotes] =
        useState("");

    const [saleItems,
        setSaleItems] =
        useState([
            {
                product_id: "",
                quantity: 1
            }
        ]);

    // =====================================
    // LOAD
    // =====================================

    useEffect(() => {

        loadSales();
        loadProducts();
        loadBusinesses();

    }, []);

    async function loadSales() {

        const res =
            await fetch(
                "/api/sales/get",
                {
                    cache: "no-store"
                }
            );

        const data =
            await res.json();

        setList(data.data || []);
    }

    async function loadProducts() {

        const res =
            await fetch(
                "/api/products/stock"
            );

        const data =
            await res.json();

        setProducts(data.data || []);
    }

    async function loadBusinesses() {

        const res =
            await fetch(
                "/api/business/list"
            );

        const data =
            await res.json();

        setBusinesses(
            Array.isArray(data)
                ? data
                : []
        );
    }

    // =====================================
    // ITEMS
    // =====================================

    function addItem() {

        setSaleItems(prev => [
            ...prev,
            {
                product_id: "",
                quantity: 1
            }
        ]);
    }

    function removeItem(index) {

        setSaleItems(prev =>
            prev.filter((_, i) =>
                i !== index
            )
        );
    }

    function updateItem(
        index,
        field,
        value
    ) {

        setSaleItems(prev =>
            prev.map((item, i) => {

                if (i !== index) {
                    return item;
                }

                return {
                    ...item,
                    [field]: value
                };
            })
        );
    }

    // =====================================
    // CREATE SALE
    // =====================================

    async function createSale() {

        const res =
            await fetch(
                "/api/sales/create",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        business_id:
                            Number(createBusinessId),

                        notes:
                            createNotes,

                        items:
                            saleItems.map(item => ({
                                product_id:
                                    Number(item.product_id),

                                quantity:
                                    Number(item.quantity)
                            }))
                    })
                }
            );

        const data =
            await res.json();

        if (!res.ok) {

            showAlert({
                title: "Error",
                text:
                    data.error,
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "OK",
            text:
                `Venta creada (${data.status})`,
            icon: "success"
        });

        setCreateOpen(false);

        setCreateBusinessId("");

        setCreateNotes("");

        setSaleItems([
            {
                product_id: "",
                quantity: 1
            }
        ]);

        loadSales();
        loadProducts();
    }

    // =====================================
    // HELPERS
    // =====================================

    function getStock(productId) {

        const product =
            products.find(
                p =>
                    Number(p.id)
                    === Number(productId)
            );

        return Number(
            product?.available || 0
        );
    }

    function getMissing(
        productId,
        qty
    ) {

        const stock =
            getStock(productId);

        return Math.max(
            0,
            qty - stock
        );
    }

    function badge(status) {

        switch (status) {

            case "pending":
                return "badge pending";

            case "partial":
                return "badge active";

            case "completed":
                return "badge success";

            default:
                return "badge";
        }
    }

    // =====================================
    // UI
    // =====================================

    return (
        <div className="container-fluid tags_container m-0 p-0">

            <TagsHeader />

            <div className="p-3">

                <div className="d-flex justify-content-between align-items-center mb-4">

                    <h2 className="tags_title">
                        💰 Ventas
                    </h2>

                    <button
                        className="tags_btn"
                        style={{maxWidth:"150px"}}
                        onClick={() =>
                            setCreateOpen(true)
                        }
                    >
                        ✚ Nueva Venta
                    </button>

                </div>

                {/* TABLE */}

                <div className="tags_table_wrapper">

                    <table className="tags_table">

                        <thead>

                            <tr>

                                <th>ID</th>

                                <th>Cliente</th>

                                <th>Items</th>

                                <th>Total</th>

                                <th>Asignados</th>

                                <th>Faltante</th>

                                <th>Estado</th>

                            </tr>

                        </thead>

                        <tbody>

                            {list.map(row => (

                                <tr key={row.id}>

                                    <td>
                                        <td>

                                            <a
                                                href={`/admin/sales/${row.id}`}
                                                style={{
                                                    fontWeight: 700,
                                                    textDecoration: "none"
                                                }}
                                            >
                                                #{row.id}
                                            </a>

                                        </td>
                                    </td>

                                    <td>
                                        {row.business_name}
                                    </td>

                                    <td>
                                        {row.items_count}
                                    </td>

                                    <td>
                                        {row.total_quantity}
                                    </td>

                                    <td>
                                        {row.delivered_quantity}
                                    </td>

                                    <td>
                                        {row.pending_quantity}
                                    </td>

                                    <td>

                                        <span className={badge(row.status)}>

                                            {row.status}

                                        </span>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

            {/* MODAL */}

            {createOpen && (

                <div className="tags_modal_overlay">

                    <div
                        className="tags_modal_card"
                        style={{
                            maxWidth: 900
                        }}
                    >

                        <button
                            className="tags_modal_close"
                            onClick={() =>
                                setCreateOpen(false)
                            }
                        >
                            ✕
                        </button>

                        <div className="tags_modal_header">

                            <h2 className="tags_modal_title">
                                Nueva Venta
                            </h2>

                        </div>

                        <div className="tags_modal_body">

                            {/* CLIENT */}

                            <div className="tags_modal_group">

                                <label>
                                    Cliente
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
                                        Seleccionar
                                    </option>

                                    {businesses.map(b => (

                                        <option
                                            key={b.id}
                                            value={b.id}
                                        >
                                            {b.name}
                                        </option>

                                    ))}

                                </select>

                            </div>

                            {/* ITEMS */}

                            <div className="d-flex flex-column gap-3">

                                {saleItems.map((item, index) => {

                                    const stock =
                                        getStock(
                                            item.product_id
                                        );

                                    const missing =
                                        getMissing(
                                            item.product_id,
                                            Number(item.quantity)
                                        );

                                    return (

                                        <div
                                            key={index}
                                            style={{
                                                padding: 15,
                                                border:
                                                    "1px solid #ddd",
                                                borderRadius: 10
                                            }}
                                        >

                                            <div className="row g-2">

                                                <div className="col-md-5">

                                                    <label>
                                                        Producto
                                                    </label>

                                                    <select
                                                        className="tags_modal_input"
                                                        value={item.product_id}
                                                        onChange={(e) =>
                                                            updateItem(
                                                                index,
                                                                "product_id",
                                                                e.target.value
                                                            )
                                                        }
                                                    >

                                                        <option value="">
                                                            Seleccionar
                                                        </option>

                                                        {products.map(p => (

                                                            <option
                                                                key={p.id}
                                                                value={p.id}
                                                            >
                                                                {p.name}
                                                            </option>

                                                        ))}

                                                    </select>

                                                </div>

                                                <div className="col-md-2">

                                                    <label>
                                                        Cantidad
                                                    </label>

                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="tags_modal_input"
                                                        value={item.quantity}
                                                        onChange={(e) =>
                                                            updateItem(
                                                                index,
                                                                "quantity",
                                                                e.target.value
                                                            )
                                                        }
                                                    />

                                                </div>

                                                <div className="col-md-2">

                                                    <label>
                                                        Stock
                                                    </label>

                                                    <div className="pt-2">

                                                        {stock}

                                                    </div>

                                                </div>

                                                <div className="col-md-2">

                                                    <label>
                                                        Faltante
                                                    </label>

                                                    <div
                                                        className="pt-2"
                                                        style={{
                                                            color:
                                                                missing > 0
                                                                    ? "red"
                                                                    : "green"
                                                        }}
                                                    >

                                                        {missing}

                                                    </div>

                                                </div>

                                                <div className="col-md-1 d-flex align-items-end">

                                                    <button
                                                        className="tags_modal_btn tags_modal_btn_cancel"
                                                        onClick={() =>
                                                            removeItem(index)
                                                        }
                                                    >
                                                        ✖
                                                    </button>

                                                </div>

                                            </div>

                                            {missing > 0 && (

                                                <div
                                                    style={{
                                                        marginTop: 10,
                                                        color: "#d97706",
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    ⚠ Se generará OP automática
                                                </div>

                                            )}

                                        </div>

                                    );
                                })}

                            </div>

                            <button
                                className="tags_btn mt-3"
                                onClick={addItem}
                            >
                                ✚ Agregar Producto
                            </button>

                            {/* NOTES */}

                            <div className="tags_modal_group mt-4">

                                <label>
                                    Notas
                                </label>

                                <textarea
                                    rows={4}
                                    className="tags_modal_input"
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
                                onClick={createSale}
                            >
                                🖫 Crear Venta
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}