// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/store/stock
// Descripción: Dashboard visual de stock real, retenido y disponible.
// =====================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    FaBoxOpen,
    FaExclamationTriangle,
    FaWarehouse,
    FaClipboardList,
    FaSearch
} from "react-icons/fa";

import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/styles/tags_store_admin.css";
import "@/app/modules/store/styles/tags_store_orders.css";

function stockStatusLabel(status) {
    if (status === "no_stock") return "Sin stock";
    if (status === "low_stock") return "Stock bajo";
    return "OK";
}

function stockStatusClass(status) {
    return `store_status_badge stock_${status || "ok"}`;
}

export default function StoreStockDashboardClient({
    businessId
}) {
    const router =
        useRouter();

    const [loading, setLoading] =
        useState(true);

    const [tableLoading, setTableLoading] =
        useState(false);

    const [data, setData] =
        useState(null);

    const [query, setQuery] =
        useState("");

    const [submittedQuery, setSubmittedQuery] =
        useState("");

    const [statusFilter, setStatusFilter] =
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

    const [expiredSummary, setExpiredSummary] =
        useState(null);

    useEffect(() => {
        loadStock({
            initial: true
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessId]);

    useEffect(() => {
        if (!businessId) {
            return;
        }

        loadStock({
            initial: false
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        page,
        submittedQuery,
        statusFilter
    ]);

    async function loadStock({
        initial = false
    } = {}) {

        if (initial) {
            setLoading(true);
        } else {
            setTableLoading(true);
        }

        try {
            const params =
                new URLSearchParams({
                    businessId,
                    page: String(page),
                    limit: "40",
                    q: submittedQuery,
                    status: statusFilter
                });

            const res =
                await fetch(
                    `/api/store/admin/stock/dashboard?${params}`,
                    {
                        cache: "no-store"
                    }
                );

            const json =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    json.error ||
                    "No se pudo cargar el stock"
                );
            }

            setData(json);

            setPagination(
                json.pagination || {
                    page: 1,
                    limit: 40,
                    total: 0,
                    totalPages: 0
                }
            );

            await loadExpiredReservations(); //Trae detalle de pedidos abandonados con productos retenidos para devolver a stock

        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });

        } finally {
            setLoading(false);
            setTableLoading(false);
        }
    }

    async function loadExpiredReservations() {
        try {
            const res =
                await fetch(
                    `/api/store/admin/orders/expired-reservations?businessId=${businessId}`,
                    {
                        cache: "no-store"
                    }
                );

            const json =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    json.error ||
                    "No se pudieron cargar los productos retenidos"
                );
            }

            setExpiredSummary(json);

            return json;

        } catch (err) {
            console.error(
                "STOCK EXPIRED RESERVATIONS ERROR:",
                err
            );

            return null;
        }
    }

    async function openRetainedProducts() {
        const summary =
            expiredSummary ||
            await loadExpiredReservations();

        if (
            !summary ||
            !summary.totalOrders
        ) {
            showAlert({
                title: "Sin productos retenidos",
                text: "No hay stock retenido por pedidos abandonados.",
                icon: "info"
            });

            return;
        }

        const ordersHtml =
            summary.expiredOrders
                .map(
                    order => `
                    <tr>
                        <td>${order.order_number}</td>
                        <td>${order.customer_name || "-"}</td>
                    </tr>
                `
                )
                .join("");

        const productsHtml =
            summary.products
                .map(
                    product => `
                    <tr>
                        <td>${product.sku || "-"}</td>
                        <td>${product.title}</td>
                        <td>${product.quantity}</td>
                    </tr>
                `
                )
                .join("");

        const confirmed =
            await showAlert({
                title: "Pedidos abandonados ",
                html: `
                <div style="text-align:left">
                    <h4>Pedidos</h4>

                    <table style="width:100%;margin-bottom:20px;">
                        ${ordersHtml}
                    </table>

                    <h4>Productos retenidos</h4>

                    <table style="width:100%;">
                        ${productsHtml}
                    </table>
                </div>
            `,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Liberar productos",
                cancelButtonText: "Cerrar"
            });

        if (!confirmed) {
            return;
        }

        const releaseRes =
            await fetch(
                "/api/store/admin/orders/release-expired",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        businessId
                    })
                }
            );

        const releaseData =
            await releaseRes.json();

        if (!releaseRes.ok) {
            showAlert({
                title: "Error",
                text:
                    releaseData.error ||
                    "No se pudieron liberar los productos retenidos",
                icon: "error"
            });

            return;
        }

        showAlert({
            title: "Productos liberados",
            text: `Se liberaron ${releaseData.released} pedidos abandonados.`,
            icon: "success"
        });

        await loadExpiredReservations();

        await loadStock({
            initial: false
        });
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

    const stats =
        data?.stats || {};

    const items =
        data?.items || [];

    return (
        <div className="qr_page_builder store_orders_v2">

            <div className="store_orders_header_v2">
                <div>
                    <div className="d-flex align-items-center gap-3">
                        <span className="store_orders_header_icon">
                            <FaWarehouse />
                        </span>

                        <h1 className="m-0">
                            Stock
                        </h1>
                    </div>

                    <p className="mt-2 mb-0">
                        Stock real, productos retenidos y disponibilidad de venta.
                    </p>
                </div>

                <div className="d-flex gap-2 flex-wrap mt-3">
                    <button
                        type="button"
                        className="qr_page_btn secondary flex-fill"
                        onClick={() =>
                           router.push(`/dashboard/businesses/${businessId}/store?tab=stock`)
                        }
                    >
                        Volver
                    </button>

                    <button
                        type="button"
                        className="qr_page_btn secondary flex-fill"
                        onClick={() =>
                            loadStock({
                                initial: false
                            })
                        }
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            <section className="store_orders_kpis mt-4">
                <article className="store_orders_kpi soft">
                    <span className="store_orders_kpi_icon">
                        <FaBoxOpen />
                    </span>

                    <div>
                        <small>Ítems con stock</small>
                        <strong>{stats.totalItems || 0}</strong>
                    </div>
                </article>

                <article className="store_orders_kpi">
                    <span className="store_orders_kpi_icon">
                        <FaWarehouse />
                    </span>

                    <div>
                        <small>Stock real</small>
                        <strong>{stats.totalStock || 0}</strong>
                    </div>
                </article>

                <article
                    className="store_orders_kpi warning clickable"
                    onClick={openRetainedProducts}
                >
                    <span className="store_orders_kpi_icon">
                        <FaClipboardList />
                    </span>

                    <div>
                        <small>Productos retenidos</small>
                        <strong>
                            {expiredSummary?.totalUnits ?? stats.totalReserved ?? 0}
                        </strong>
                    </div>
                </article>

                <article className="store_orders_kpi">
                    <span className="store_orders_kpi_icon">
                        <FaBoxOpen />
                    </span>

                    <div>
                        <small>Disponible</small>
                        <strong>{stats.totalAvailable || 0}</strong>
                    </div>
                </article>

                <article className="store_orders_kpi">
                    <span className="store_orders_kpi_icon">
                        <FaExclamationTriangle />
                    </span>

                    <div>
                        <small>Stock bajo</small>
                        <strong>{stats.lowStock || 0}</strong>
                    </div>
                </article>

                <article className="store_orders_kpi danger">
                    <span className="store_orders_kpi_icon">
                        <FaExclamationTriangle />
                    </span>

                    <div>
                        <small>Sin stock</small>
                        <strong>{stats.noStock || 0}</strong>
                    </div>
                </article>
            </section>

            <section className="store_orders_toolbar">
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
                        placeholder="Buscar por producto, variante o SKU..."
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
                    value={statusFilter}
                    onChange={(e) => {
                        setPage(1);
                        setStatusFilter(
                            e.target.value
                        );
                    }}
                >
                    <option value="">Todos los estados</option>
                    <option value="ok">OK</option>
                    <option value="low_stock">Stock bajo</option>
                    <option value="no_stock">Sin stock</option>
                </select>
            </section>

            <section className="store_orders_table_panel">
                {tableLoading && (
                    <div className="store_orders_empty_state">
                        Actualizando stock...
                    </div>
                )}

                <div className="store_orders_table_scroll">
                    <table className="store_orders_table_v2">
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Producto</th>
                                <th>Variante</th>
                                <th>Stock real</th>
                                <th>Retenido</th>
                                <th>Disponible</th>
                                <th>Estado</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map(item => (
                                <tr
                                    key={`${item.item_type}-${item.variant_id || item.product_id}`}
                                >
                                    <td>
                                        <strong>
                                            {item.sku || "-"}
                                        </strong>
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
                                        <strong>
                                            {item.stock_qty}
                                        </strong>
                                    </td>

                                    <td>
                                        <strong>
                                            {item.reserved_qty}
                                        </strong>
                                    </td>

                                    <td>
                                        <strong>
                                            {item.available_qty}
                                        </strong>
                                    </td>

                                    <td>
                                        <span className={stockStatusClass(item.stock_status)}>
                                            {stockStatusLabel(item.stock_status)}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {!items.length && (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="store_orders_empty_state">
                                            No hay ítems para los filtros seleccionados.
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

            <div style={{ height: 50 }} />

        </div>
    );
}