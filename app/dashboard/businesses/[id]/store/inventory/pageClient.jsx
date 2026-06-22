// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/store/inventory
// Descripción: Editor masivo de precios, ofertas, stock y visibilidad.
// =====================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    FaBoxes,
    FaSearch,
    FaSave,
    FaPercent,
    FaArrowLeft
} from "react-icons/fa";

import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/styles/tags_store_admin.css";
import "@/app/modules/store/styles/tags_store_orders.css";

function toNumber(value) {
    const n =
        Number(value);

    return Number.isFinite(n)
        ? n
        : 0;
}

function applyPercent(value, percent) {
    return Math.round(
        toNumber(value) * (1 + toNumber(percent) / 100)
    );
}

export default function StoreInventoryClient({
    businessId
}) {
    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [items, setItems] =
        useState([]);

    const [categories, setCategories] =
        useState([]);

    const [query, setQuery] =
        useState("");

    const [submittedQuery, setSubmittedQuery] =
        useState("");

    const [categoryId, setCategoryId] =
        useState("");

    const [page, setPage] =
        useState(1);

    const [pagination, setPagination] =
        useState({
            page: 1,
            limit: 40,
            total: 0,
            totalPages: 0
        });

    const [bulkPercent, setBulkPercent] =
        useState("");

    useEffect(() => {
        loadInventory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        businessId,
        page,
        submittedQuery,
        categoryId
    ]);

    async function loadInventory() {
        setLoading(true);

        try {
            const params =
                new URLSearchParams({
                    businessId,
                    page: String(page),
                    limit: "40",
                    q: submittedQuery,
                    categoryId
                });
                 console.log(
    `/api/store/admin/inventory/list?${params}`
);


            const res =
                await fetch(
                    `/api/store/admin/inventory/list?${params}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo cargar el inventario"
                );
            }

            setItems(data.items || []);
            setCategories(data.categories || []);

            setPagination(
                data.pagination || {
                    page: 1,
                    limit: 40,
                    total: 0,
                    totalPages: 0
                }
            );

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setLoading(false);
        }
    }

    function updateItem(index, field, value) {
        setItems(prev =>
            prev.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        [field]: value
                    }
                    : item
            )
        );
    }

    async function saveInventory() {
        const confirmed =
            await showAlert({
                title: "Guardar inventario",
                text: "¿Deseas guardar los cambios de precios, ofertas, stock y visibilidad?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Guardar",
                cancelButtonText: "Cancelar"
            });

        if (!confirmed) {
            return;
        }

        setSaving(true);

        try {
            const res =
                await fetch(
                    "/api/store/admin/inventory/save",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            items
                        })
                    }
                );

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error ||
                    "No se pudo guardar el inventario"
                );
            }

            showAlert({
                title: "Inventario actualizado",
                text: `Se guardaron ${data.saved} ítems.`,
                icon: "success",
                timer: 1400
            });

            await loadInventory();

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setSaving(false);
        }
    }

    function applyBulkPricePercent() {
        const percent =
            toNumber(bulkPercent);

        if (!percent) {
            showAlert({
                title: "Valor requerido",
                text: "Ingresá un porcentaje para aplicar.",
                icon: "info"
            });

            return;
        }

        setItems(prev =>
            prev.map(item => ({
                ...item,
                price:
                    applyPercent(
                        item.price,
                        percent
                    )
            }))
        );
    }

    function applyBulkSalePercent() {
        const percent =
            Math.abs(
                toNumber(bulkPercent)
            );

        if (!percent) {
            showAlert({
                title: "Valor requerido",
                text: "Ingresá un porcentaje de descuento.",
                icon: "info"
            });

            return;
        }

        setItems(prev =>
            prev.map(item => ({
                ...item,
                sale_price:
                    Math.round(
                        toNumber(item.price) *
                        (1 - percent / 100)
                    )
            }))
        );
    }

    function clearBulkSale() {
        setItems(prev =>
            prev.map(item => ({
                ...item,
                sale_price: ""
            }))
        );
    }

    function submitSearch() {
        setPage(1);
        setSubmittedQuery(
            query.trim()
        );
    }

    if (loading) {
        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    return (
        <div className="qr_page_builder store_orders_v2">

            <div className="store_orders_header_v2">
                <div>
                    <div className="d-flex align-items-center gap-3">
                        <span className="store_orders_header_icon">
                            <FaBoxes />
                        </span>

                        <h1 className="m-0">
                            Inventario
                        </h1>
                    </div>

                    <p className="mt-2 mb-0">
                        Gestión rápida de precios, ofertas, stock y visibilidad.
                    </p>
                </div>

                <div className="d-flex gap-2 flex-wrap mt-3">
                    <button
                        type="button"
                        className="store_orders_btn secondary flex-fill"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/store`
                            )
                        }
                    >
                        <FaArrowLeft />
                        <span>Volver a tienda</span>
                    </button>

                    <button
                        type="button"
                        className="store_orders_btn primary flex-fill"
                        disabled={saving}
                        onClick={saveInventory}
                    >
                        <FaSave />
                        <span>Guardar cambios</span>
                    </button>
                </div>
            </div>

            <section className="store_orders_toolbar mt-4">
                <div className="store_orders_search_box">
                    <input
                        value={query}
                        onChange={(e) =>
                            setQuery(e.target.value)
                        }
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                submitSearch();
                            }
                        }}
                        placeholder="Buscar producto, variante o SKU..."
                    />

                    <button
                        type="button"
                        className="store_orders_search_btn"
                        onClick={submitSearch}
                        title="Buscar"
                    >
                        <FaSearch />
                    </button>
                </div>

                <select
                    value={categoryId}
                    onChange={(e) => {
                        setPage(1);
                        setCategoryId(e.target.value);
                    }}
                >
                    <option value="">Todas las categorías</option>

                    {categories.map(category => (
                        <option
                            key={category.id}
                            value={category.id}
                        >
                            {category.name}
                        </option>
                    ))}
                </select>
            </section>

            <section className="store_orders_toolbar">
                <div className="store_orders_search_box">
                    <input
                        type="number"
                        value={bulkPercent}
                        onChange={(e) =>
                            setBulkPercent(e.target.value)
                        }
                        placeholder="% aumento / descuento"
                    />

                    <button
                        type="button"
                        className="store_orders_btn secondary"
                        onClick={applyBulkPricePercent}
                    >
                        <FaPercent />
                        <span>Aumentar precios</span>
                    </button>

                    <button
                        type="button"
                        className="store_orders_btn secondary"
                        onClick={applyBulkSalePercent}
                    >
                        <FaPercent />
                        <span>Aplicar oferta</span>
                    </button>

                    <button
                        type="button"
                        className="store_orders_btn secondary"
                        onClick={clearBulkSale}
                    >
                        Quitar ofertas
                    </button>
                </div>
            </section>

            <section className="store_orders_table_panel">
                <div className="store_orders_table_scroll">
                    <table className="store_orders_table_v2">
                        <thead>
                            <tr>
                                <th>Categoría</th>
                                <th>Producto</th>
                                <th>Variante</th>
                                <th>SKU</th>
                                <th>Precio</th>
                                <th>Oferta</th>
                                <th>Stock</th>
                                <th>En Tienda</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((item, index) => (
                                <tr
                                    key={`${item.item_type}-${item.variant_id || item.product_id}`}
                                >
                                    <td>
                                        <small>
                                            {item.category_name || "-"}
                                        </small>
                                    </td>

                                    <td>
                                        <strong>
                                            {item.product_title}
                                        </strong>
                                    </td>

                                    <td>
                                        <small>
                                            {item.variant_title || "Sin variante"}
                                        </small>
                                    </td>

                                    <td>
                                        <input
                                            value={item.sku || ""}
                                            disabled
                                        />
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.price ?? ""}
                                            onChange={(e) =>
                                                updateItem(
                                                    index,
                                                    "price",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.sale_price ?? ""}
                                            onChange={(e) =>
                                                updateItem(
                                                    index,
                                                    "sale_price",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.stock_qty ?? 0}
                                            onChange={(e) =>
                                                updateItem(
                                                    index,
                                                    "stock_qty",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </td>

                                    <td>
                                        <select
                                            value={String(item.is_visible)}
                                            onChange={(e) =>
                                                updateItem(
                                                    index,
                                                    "is_visible",
                                                    Number(e.target.value)
                                                )
                                            }
                                        >
                                            <option value="1">Mostrar</option>
                                            <option value="0">Ocultar</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}

                            {!items.length && (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="store_orders_empty_state">
                                            No hay productos para los filtros seleccionados.
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {
                pagination.totalPages > 1 && (
                    <div
                        className="store_orders_pagination"
                        style={{
                            marginTop: 20,
                            marginBottom: 70
                        }}
                    >
                        <button
                            type="button"
                            className="store_orders_btn secondary"
                            disabled={page <= 1}
                            onClick={() =>
                                setPage(prev => prev - 1)
                            }
                        >
                            ← Anterior
                        </button>

                        <div className="store_orders_pagination_info">
                            Página {pagination.page} de {pagination.totalPages}

                            <small>
                                {pagination.total} registros
                            </small>
                        </div>

                        <button
                            type="button"
                            className="store_orders_btn secondary"
                            disabled={page >= pagination.totalPages}
                            onClick={() =>
                                setPage(prev => prev + 1)
                            }
                        >
                            Siguiente →
                        </button>
                    </div>
                )
            }

            <div style={{ minHeight: 60 }} />

        </div>
    );
}