// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/store/orders
// Descripción: Lista moderna de pedidos de Tags Tienda.
// =====================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "../../../../../modules/store/styles/tags_store_orders.css"

import {
    FaBoxOpen,
    FaTruck,
    FaUser,
    FaMoneyBillWave,
    FaWhatsapp,
    FaMapMarkerAlt,
    FaClipboardList,
    FaSearch
} from "react-icons/fa";

import showAlert from "@/app/components/showAlert";
import TagsSpinner from "@/app/components/TagsSpinner";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/styles/tags_store_admin.css";

function formatPrice(value, currency = "ARS") {
    return `${currency} ${Number(value || 0).toLocaleString("es-AR")}`;
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function getOrderStatusClass(value) {
    return `store_status_badge order_${value || "new"}`;
}

function getPaymentStatusClass(value) {
    return `store_status_badge payment_${value || "pending"}`;
}

const orderStatusLabels = {
    new: "Nuevo",
    confirmed: "Confirmado",
    preparing: "Preparando",
    shipped: "Enviado",
    completed: "Completado",
    cancelled: "Cancelado"
};

const paymentStatusLabels = {
    pending: "Pendiente",
    paid: "Pagado",
    cancelled: "Cancelado",
    refunded: "Reintegrado"
};

export default function StoreOrdersClient({
    businessId
}) {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [orders, setOrders] = useState([]);
    const [storeMissing, setStoreMissing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("");
    const [page, setPage] = useState(1);
    const [query, setQuery] = useState("");
    const [submittedQuery, setSubmittedQuery] = useState("");

    const [pagination, setPagination] =
        useState({
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0
        });
    const [expiredSummary, setExpiredSummary] =
        useState(null);

    useEffect(() => {
        loadOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        businessId,
        page,
        submittedQuery,
        statusFilter,
        paymentFilter
    ]);

    async function loadOrders() {
        if (!hasLoaded) {
            setLoading(true);
        } else {
            setTableLoading(true);
        }

        try {
            const params =
                new URLSearchParams({
                    businessId,
                    page,
                    limit: 20,
                    q: submittedQuery,
                    status: statusFilter,
                    payment: paymentFilter
                });

            const res = await fetch(
                `/api/store/admin/orders/list?${params}`,
                {
                    cache: "no-store"
                }
            );

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(data?.error || "No se pudieron cargar los pedidos");
            }

            setStoreMissing(!!data.storeMissing);
            setOrders(data.orders || []);
            setPagination(
                data.pagination || {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0
                }
            );

            setHasLoaded(true);

            await loadExpiredReservations();//trae los productos en ordenes que los clientes abandonaron, para recuperarlos para stock

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

            const data =
                await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error
                );
            }

            setExpiredSummary(data);

        } catch (err) {

            console.error(
                err
            );

        }
    }

    async function openExpiredReservations() {

        if (
            !expiredSummary ||
            !expiredSummary.totalOrders
        ) {

            showAlert({
                title:
                    "Sin pedidos abandonados vencidos",
                text:
                    "No hay productos retenidos para liberar.",
                icon:
                    "info"
            });

            return;
        }

        const ordersHtml =
            expiredSummary.expiredOrders
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
            expiredSummary.products
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
                title:
                    "Pedidos abandonados (+72 hs)",
                html: `
                <div style="text-align:left">

                    <h4>
                        Pedidos
                    </h4>

                    <table
                        style="
                            width:100%;
                            margin-bottom:20px;
                        "
                    >
                        ${ordersHtml}
                    </table>

                    <h4>
                        Productos Retenidos
                    </h4>

                    <table
                        style="
                            width:100%;
                        "
                    >
                        ${productsHtml}
                    </table>

                </div>
            `,
                icon:
                    "warning",
                showCancelButton: true,
                confirmButtonText:
                    "Liberar reservas",
                cancelButtonText:
                    "Cerrar"
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
                        "Content-Type":
                            "application/json"
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
                title:
                    "Error",
                text:
                    releaseData.error,
                icon:
                    "error"
            });

            return;
        }

        showAlert({
            title:
                "Reservas liberadas",
            text:
                `Se liberaron ${releaseData.released} pedidos.`,
            icon:
                "success"
        });

        await loadOrders();
    }

    async function updateStatus(order, field, value) {
        try {
            const res = await fetch(
                "/api/store/admin/orders/status",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        businessId,
                        orderId: order.id,
                        [field]: value
                    })
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || "No se pudo actualizar el pedido");
            }

            setOrders(prev =>
                prev.map(item =>
                    item.id === order.id
                        ? {
                            ...item,
                            [field]: value
                        }
                        : item
                )
            );

            showAlert({
                title: "Estado actualizado",
                text: "El pedido fue actualizado correctamente.",
                icon: "success",
                timer: 1200
            });
        } catch (err) {
            showAlert({
                title: "Error",
                text: err.message,
                icon: "error"
            });
        }
    }



    const stats = useMemo(() => {
        return {
            total: orders.length,
            pending: orders.filter(order => order.payment_status === "pending").length,
            paid: orders.filter(order => order.payment_status === "paid").length,
            shipped: orders.filter(order => order.order_status === "shipped").length,
            revenue: orders.reduce(
                (acc, order) => acc + Number(order.total || 0),
                0
            )
        };
    }, [orders]);

    if (loading) {
        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    if (storeMissing) {
        return (
            <div className="qr_page_builder store_orders_v2">
                <div className="store_orders_header_v2">
                    <div>
                        <span className="store_orders_header_icon"><FaClipboardList /></span>
                        <h1>Pedidos</h1>
                        <p>Primero necesitás crear la tienda.</p>
                    </div>

                    <button
                        type="button"
                        className="store_orders_btn primary"
                        onClick={() =>
                            router.push(`/dashboard/businesses/${businessId}/store`)
                        }
                    >
                        Ir a Tags Tienda
                    </button>
                </div>

                <div className="store_orders_empty_state">
                    Para recibir pedidos, primero tenés que guardar la configuración general de Tags Tienda.
                </div>
            </div>
        );
    }

    return (
        <div className="qr_page_builder store_orders_v2">

            <div className="store_orders_header_v2">
                <div>

                    <div className="d-flex align-items-center gap-3">

                        <span className="store_orders_header_icon">
                            <FaClipboardList />
                        </span>

                        <h1 className="m-0">
                            Pedidos
                        </h1>

                    </div>

                    <p className="mt-2 mb-0">
                        Pedidos generados desde la tienda,
                        WhatsApp y pagos online.
                    </p>

                </div>

                <div className="d-flex gap-2 flex-wrap mt-3">
                    <button
                        type="button"
                        className="store_orders_btn secondary flex-fill"
                        onClick={() =>
                            router.push(`/dashboard/businesses/${businessId}/store`)
                        }
                    >
                        Volver a tienda
                    </button>

                    <button
                        type="button"
                        className="store_orders_btn secondary flex-fill"
                        onClick={loadOrders}
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            <section className="store_orders_kpis mt-4">
                <article className="store_orders_kpi soft">
                    <span className="store_orders_kpi_icon"><FaClipboardList /></span>
                    <div>
                        <small>Total pedidos</small>
                        <strong>{stats.total}</strong>
                    </div>
                </article>

                <article className="store_orders_kpi">
                    <span className="store_orders_kpi_icon"><FaMoneyBillWave /></span>
                    <div>
                        <small>Pagos pendientes</small>
                        <strong>{stats.pending}</strong>
                    </div>
                </article>

                <article className="store_orders_kpi">
                    <span className="store_orders_kpi_icon"><FaMoneyBillWave /></span>
                    <div>
                        <small>Pagados</small>
                        <strong>{stats.paid}</strong>
                    </div>
                </article>

                <article className="store_orders_kpi">
                    <span className="store_orders_kpi_icon"><FaTruck /></span>
                    <div>
                        <small>Enviados</small>
                        <strong>{stats.shipped}</strong>
                    </div>
                </article>

                <article className="store_orders_kpi revenue">
                    <span className="store_orders_kpi_icon"><FaMoneyBillWave /></span>
                    <div>
                        <small>Total vendido</small>
                        <strong>{formatPrice(stats.revenue)}</strong>
                    </div>
                </article>

                <article
                    className="store_orders_kpi warning clickable"
                    onClick={openExpiredReservations}
                >
                    <span className="store_orders_kpi_icon">
                        ⚠️
                    </span>

                    <div>
                        <small>
                            Pedidos Abandonados
                        </small>

                        <strong>
                            {
                                expiredSummary?.totalOrders || 0
                            }
                        </strong>

                        <small>
                            {
                                expiredSummary?.totalUnits || 0
                            } productos retenidos
                        </small>
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
                                setPage(1);
                                setSubmittedQuery(query.trim());
                            }
                        }}
                        placeholder="Buscar pedido, cliente, email, teléfono, producto o SKU..."
                    />

                    <button
                        type="button"
                        className="store_orders_search_btn"
                        onClick={() => {
                            setPage(1);
                            setSubmittedQuery(query.trim());
                        }}
                        title="Buscar"
                    >
                        <FaSearch />
                    </button>
                </div>


                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setPage(1);
                        setStatusFilter(e.target.value);
                    }}
                >
                    <option value="">Todos los estados</option>
                    {Object.entries(orderStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>

                <select
                    value={paymentFilter}
                    onChange={(e) => {
                        setPage(1);
                        setPaymentFilter(e.target.value);
                    }}
                >
                    <option value="">Todos los pagos</option>
                    {Object.entries(paymentStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </section>

            <section className="store_orders_table_panel">
                {tableLoading && (
                    <div className="px-3 py-2 text-muted small">
                        Actualizando pedidos...
                    </div>
                )}

                <div className="store_orders_table_scroll">
                    <table className="store_orders_table_v2">
                        <thead>
                            <tr>
                                <th><FaClipboardList /> Pedido</th>
                                <th><FaUser /> Cliente</th>
                                <th><FaMoneyBillWave /> Total</th>
                                <th>Pago</th>
                                <th><FaTruck /> Entrega</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td>
                                        <button
                                            type="button"
                                            className="store_order_link"
                                            onClick={() =>
                                                router.push(
                                                    `/dashboard/businesses/${businessId}/store/orders/${order.id}`
                                                )
                                            }
                                        >
                                            {order.order_number}
                                        </button>
                                        <span className="store_order_items_count">
                                            {order.items_count || 0} item(s)
                                        </span>
                                    </td>

                                    <td>
                                        <strong>{order.customer_name || "Sin datos"}</strong>
                                        <small>{order.customer_phone || order.customer_email || "Sin contacto"}</small>
                                    </td>

                                    <td>
                                        <strong>{formatPrice(order.total)}</strong>
                                    </td>

                                    <td>
                                        <span className={getPaymentStatusClass(order.payment_status)}>
                                            {paymentStatusLabels[order.payment_status] || order.payment_status || "Pendiente"}
                                        </span>
                                        <small>{order.payment_method || "-"}</small>
                                    </td>

                                    <td>
                                        <strong>
                                            {order.shipping_method_name || order.carrier_name || "A coordinar"}
                                        </strong>
                                        <small>
                                            {Number(order.shipping_total || 0) > 0
                                                ? formatPrice(order.shipping_total)
                                                : "Sin costo / pendiente"}
                                        </small>
                                    </td>

                                    <td>
                                        <span className={getOrderStatusClass(order.order_status)}>
                                            {orderStatusLabels[order.order_status] || order.order_status || "Nuevo"}
                                        </span>
                                    </td>

                                    <td>{formatDate(order.created_at)}</td>

                                    <td className="store_orders_actions_cell">
                                        <button
                                            type="button"
                                            className="store_orders_btn dark"
                                            onClick={() =>
                                                router.push(
                                                    `/dashboard/businesses/${businessId}/store/orders/${order.id}`
                                                )
                                            }
                                        >
                                            Ver
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {!orders.length && (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="store_orders_empty_state">
                                            No hay pedidos para los filtros seleccionados.
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

                    <div className="store_orders_pagination">

                        <button
                            type="button"
                            className="store_orders_btn secondary"
                            disabled={page <= 1}
                            onClick={() =>
                                setPage(
                                    prev => prev - 1
                                )
                            }
                        >
                            ← Anterior
                        </button>

                        <div
                            className="store_orders_pagination_info"
                        >
                            Página {pagination.page} de {pagination.totalPages}

                            <small>
                                {pagination.total} pedidos
                            </small>
                        </div>

                        <button
                            type="button"
                            className="store_orders_btn secondary"
                            disabled={
                                page >= pagination.totalPages
                            }
                            onClick={() =>
                                setPage(
                                    prev => prev + 1
                                )
                            }
                        >
                            Siguiente →
                        </button>

                    </div>

                )
            }

        </div>
    );
}
