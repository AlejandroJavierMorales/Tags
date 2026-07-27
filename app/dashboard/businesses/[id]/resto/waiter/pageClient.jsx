// =====================================
// FILE: /app/dashboard/businesses/[id]/resto/waiter/pageClient.jsx
// Descripción:
// Pantalla operativa de Mozo.
// =====================================

"use client";

import {
    useCallback,
    useEffect,
    useState
} from "react";

import {
    useRouter
} from "next/navigation";

import Swal
    from "sweetalert2";

import {
    FaBell,
    FaCashRegister,
    FaChair,
    FaCheck,
    FaFire,
    FaHome,
    FaEye,
    FaReceipt,
    FaSyncAlt,
    FaTimes,
    FaUtensils
} from "react-icons/fa";

import showAlert
    from "@/app/components/showAlert";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import {
    formatRestoOrderNumber,
    formatRestoOrderPrice,
    getRestoOrderElapsedTime,
    getRestoOrderLocationName
} from "@/app/modules/resto/lib/orders";

import {
    requestRestoPayment
} from "@/app/modules/resto/lib/cash/requestRestoPayment";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/modules/resto/styles/orders/index.css";

const statCards = [
    {
        key:
            "deliveries",
        label:
            "Para entregar",
        description:
            "Pedidos con platos listos",
        icon:
            FaFire,
        tone:
            "success"
    },
    {
        key:
            "calls",
        label:
            "Llamados",
        description:
            "Solicitudes de atención",
        icon:
            FaBell,
        tone:
            "danger"
    },
    {
        key:
            "bills",
        label:
            "Piden cuenta",
        description:
            "Esperando atención",
        icon:
            FaReceipt,
        tone:
            "warning"
    }
];

export default function RestoWaiterPageClient({
    businessId,
    permissions = ["*"]
}) {

    const router =
        useRouter();

    const can =
        permission =>
            permissions.includes("*") ||
            permissions.includes(permission);

    const [loading, setLoading] =
        useState(
            true
        );

    const [refreshing, setRefreshing] =
        useState(
            false
        );

    const [updatingOrderId, setUpdatingOrderId] =
        useState(
            null
        );

    const [store, setStore] =
        useState(
            null
        );

    const [deliveries, setDeliveries] =
        useState(
            []
        );

    const [kitchenOrders, setKitchenOrders] =
        useState([]);

    const [tableRequests, setTableRequests] =
        useState([]);

    const [onlineOrders, setOnlineOrders] =
        useState([]);

    const [calls, setCalls] =
        useState(
            []
        );

    const [bills, setBills] =
        useState(
            []
        );

    const [closableOrders, setClosableOrders] =
        useState([]);

    const [stats, setStats] =
        useState({
            deliveries:
                0,
            ready_items:
                0,
            calls:
                0,
            bills:
                0
        });

    const loadWaiter =
        useCallback(
            async ({
                silent = false
            } = {}) => {

                if (silent) {

                    setRefreshing(
                        true
                    );

                } else {

                    setLoading(
                        true
                    );

                }

                try {

                    const response =
                        await fetch(
                            `/api/resto/admin/waiter?businessId=${encodeURIComponent(
                                businessId
                            )}`,
                            {
                                cache:
                                    "no-store"
                            }
                        );

                    const data =
                        await response
                            .json()
                            .catch(
                                () => null
                            );

                    if (!response.ok) {

                        throw new Error(
                            data?.error ||
                            "No se pudo cargar la pantalla de Mozo."
                        );

                    }

                    setStore(
                        data?.store ||
                        null
                    );

                    setDeliveries(
                        Array.isArray(
                            data?.deliveries
                        )
                            ? data.deliveries
                            : []
                    );

                    setKitchenOrders(
                        Array.isArray(
                            data?.kitchen_orders
                        )
                            ? data.kitchen_orders
                            : []
                    );

                    setTableRequests(
                        Array.isArray(
                            data?.table_requests
                        )
                            ? data.table_requests
                            : []
                    );

                    setOnlineOrders(
                        Array.isArray(
                            data?.online_orders
                        )
                            ? data.online_orders
                            : []
                    );

                    setCalls(
                        Array.isArray(
                            data?.calls
                        )
                            ? data.calls
                            : []
                    );

                    setBills(
                        Array.isArray(
                            data?.bills
                        )
                            ? data.bills
                            : []
                    );

                    setClosableOrders(
                        Array.isArray(
                            data?.closable_orders
                        )
                            ? data.closable_orders
                            : []
                    );

                    setStats(
                        data?.stats ||
                        {}
                    );

                } catch (err) {

                    console.error(
                        "RESTO WAITER LOAD ERROR:",
                        err
                    );

                    showAlert({
                        icon:
                            "error",
                        title:
                            "Mozo",
                        text:
                            err.message ||
                            "No se pudo cargar la pantalla."
                    });

                } finally {

                    setLoading(
                        false
                    );

                    setRefreshing(
                        false
                    );

                }

            },
            [
                businessId
            ]
        );

    useEffect(
        () => {

            loadWaiter();

        },
        [
            loadWaiter
        ]
    );

    useEffect(
        () => {

            const timer =
                setInterval(
                    () => {

                        loadWaiter({
                            silent:
                                true
                        });

                    },
                    10000
                );

            return () =>
                clearInterval(
                    timer
                );

        },
        [
            loadWaiter
        ]
    );

    async function runAction(
        order,
        action,
        successMessage,
        extra = {}
    ) {

        setUpdatingOrderId(
            order.id
        );

        try {

            const response =
                await fetch(
                    "/api/resto/admin/waiter",
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                businessId,
                                orderId:
                                    order.id,
                                action,
                                ...extra
                            })
                    }
                );

            const data =
                await response
                    .json()
                    .catch(
                        () => null
                    );

            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    "No se pudo actualizar la atención."
                );

            }

            await loadWaiter({
                silent:
                    true
            });

            showAlert({
                icon:
                    "success",
                title:
                    "Mozo",
                text:
                    successMessage,
                timer:
                    1200,
                showConfirmButton:
                    false
            });

        } catch (err) {

            showAlert({
                icon:
                    "error",
                title:
                    "Mozo",
                text:
                    err.message ||
                    "No se pudo actualizar la atención."
            });

        } finally {

            setUpdatingOrderId(
                null
            );

        }

    }

    async function cancelPendingSession(
        order
    ) {

        const result =
            await Swal.fire({
                icon: "warning",
                title:
                    "Cancelar pedido",
                input: "textarea",
                inputLabel:
                    "Motivo",
                showCancelButton: true,
                confirmButtonText:
                    "Cancelar pedido",
                cancelButtonText:
                    "Volver",
                confirmButtonColor:
                    "#dc3545",
                inputValidator:
                    value =>
                        !String(
                            value || ""
                        ).trim()
                            ? "Ingresá el motivo"
                            : null
            });

        if (!result.isConfirmed) {

            return;

        }

        await runAction(
            order,
            "cancel_session",
            "La sesión fue cancelada.",
            {
                reason:
                    String(
                        result.value
                    ).trim()
            }
        );

    }

    async function closeOrder(
        order
    ) {

        const confirmed =
            await showAlert({
                icon:
                    "question",
                title:
                    "Cerrar pedido",
                text:
                    "¿Confirmás el cierre del pedido? La mesa quedará libre.",
                showCancelButton:
                    true,
                confirmButtonText:
                    "Sí, cerrar",
                cancelButtonText:
                    "Volver"
            });

        if (!confirmed) {

            return;

        }

        await runAction(
            order,
            "close_session",
            "El pedido fue cerrado y la mesa quedó libre."
        );

    }

    async function openTable() {

        try {

            const response =
                await fetch(
                    `/api/resto/admin/locations/list?businessId=${encodeURIComponent(
                        businessId
                    )}`,
                    {
                        cache: "no-store"
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "No se pudieron cargar las mesas"
                );

            }

            const tables =
                (
                    data.locations || []
                ).filter(
                    location =>
                        location.location_type ===
                            "table" &&
                        location.is_active
                );

            const inputOptions =
                Object.fromEntries(
                    tables.map(
                        location => [
                            String(location.id),
                            [
                                location.parent_name,
                                location.name
                            ]
                                .filter(Boolean)
                                .join(" · ")
                        ]
                    )
                );

            const tableSelection =
                await Swal.fire({
                    title:
                        "Abrir mesa",
                    input:
                        "select",
                    inputOptions,
                    inputPlaceholder:
                        "Seleccioná sector y mesa",
                    showCancelButton:
                        true,
                    confirmButtonText:
                        "Continuar",
                    cancelButtonText:
                        "Cancelar",
                    inputValidator:
                        value =>
                            !value
                                ? "Seleccioná una mesa"
                                : null
                });

            if (!tableSelection.isConfirmed) {

                return;

            }

            const customer =
                await Swal.fire({
                    title:
                        inputOptions[
                            tableSelection.value
                        ],
                    input:
                        "text",
                    inputLabel:
                        "Nombre del cliente",
                    inputPlaceholder:
                        "Ejemplo: Juan",
                    showCancelButton:
                        true,
                    confirmButtonText:
                        "Abrir mesa",
                    cancelButtonText:
                        "Cancelar",
                    inputValidator:
                        value =>
                            !String(
                                value || ""
                            ).trim()
                                ? "Ingresá el nombre"
                                : null
                });

            if (!customer.isConfirmed) {

                return;

            }

            const openResponse =
                await fetch(
                    "/api/resto/admin/waiter/open-table",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                businessId,
                                locationId:
                                    Number(
                                        tableSelection.value
                                    ),
                                customerName:
                                    String(
                                        customer.value
                                    ).trim()
                            })
                    }
                );

            const openData =
                await openResponse.json();

            if (!openResponse.ok) {

                throw new Error(
                    openData.error ||
                    "No se pudo abrir la mesa"
                );

            }

            await loadWaiter({
                silent: true
            });

            showAlert({
                icon: "success",
                title: "Mesa abierta",
                text:
                    `Se creó el pedido ${openData.order_number}.`
            });

        } catch (err) {

            showAlert({
                icon: "error",
                title: "Abrir mesa",
                text:
                    err.message
            });

        }

    }

    async function registerPayment(
        order
    ) {

        const payment =
            await requestRestoPayment(
                order,
                {
                    currency:
                        store?.currency ||
                        order.currency ||
                        "ARS"
                }
            );

        if (!payment) {

            return;

        }

        setUpdatingOrderId(
            order.id
        );

        try {

            const response =
                await fetch(
                    "/api/resto/admin/orders/payment",
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                businessId,
                                orderId:
                                    order.id,
                                amount:
                                    payment.amount,
                                payment_method:
                                    payment.payment_method,
                                notes:
                                    payment.notes
                            })
                    }
                );

            const data =
                await response
                    .json()
                    .catch(
                        () => null
                    );

            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    "No se pudo registrar el cobro."
                );

            }

            await loadWaiter({
                silent:
                    true
            });

            showAlert({
                icon:
                    "success",
                title:
                    "Cobro",
                text:
                    "El cobro fue registrado.",
                timer:
                    1200
            });

        } catch (err) {

            showAlert({
                icon:
                    "error",
                title:
                    "Cobro",
                text:
                    err.message ||
                    "No se pudo registrar el cobro."
            });

        } finally {

            setUpdatingOrderId(
                null
            );

        }

    }

    function OrderIdentity({
        order,
        eventAt = null,
        eventLabel = null,
        detail = null
    }) {

        return (
            <div>
                <strong className="d-block fs-5">
                    {getRestoOrderLocationName(order)}
                </strong>

                {
                    detail && (

                        <span className="d-block fw-semibold text-danger">
                            {detail}
                        </span>

                    )
                }

                <span className="text-muted">
                    Pedido {formatRestoOrderNumber(order)}
                    {" · "}
                    {
                        eventLabel
                            ? `${eventLabel} `
                            : ""
                    }
                    {getRestoOrderElapsedTime(
                        eventAt ||
                        order.created_at
                    )}
                </span>
            </div>
        );

    }

    if (loading) {

        return (
            <div className="tags_resto_orders_loading">
                <TagsSpinner />
            </div>
        );

    }

    return (
        <main className="tags_resto_orders_page px-2 mb-5 pb-5">
            <header className="tags_resto_orders_header">
                <div className="tags_resto_orders_header_left">
                    <div className="tags_resto_orders_header_identity">
                        <div className="tags_resto_orders_header_icon">
                            <FaUtensils />
                        </div>

                        <div className="tags_resto_orders_header_content">
                            <h1 className="tags_resto_orders_title">
                                Mozo
                            </h1>

                            <h2 className="tags_resto_orders_business">
                                {store?.name || "Tags Resto"}
                            </h2>

                            <p className="tags_resto_orders_subtitle">
                                Entregas y atención en tiempo real
                            </p>
                        </div>
                    </div>
                </div>

                <div className="tags_resto_orders_header_right">
                    <div className="tags_resto_btn_group">
                        {can("kitchen.view") && <button
                            type="button"
                            className="tags_resto_btn tags_resto_btn_secondary"
                            onClick={() =>
                                router.push(
                                    `/dashboard/businesses/${businessId}/resto`
                                )
                            }
                        >
                            <FaHome />
                            Inicio
                        </button>}

                        {can("tables.view") && <button
                            type="button"
                            className="tags_resto_btn tags_resto_btn_primary"
                            onClick={() =>
                                router.push(
                                    `/dashboard/businesses/${businessId}/resto/kitchen`
                                )
                            }
                        >
                            <FaFire />
                            Cocina
                        </button>}

                        {can("tables.open") && <button
                            type="button"
                            className="tags_resto_btn tags_resto_btn_primary"
                            onClick={() =>
                                router.push(
                                    `/dashboard/businesses/${businessId}/resto/tables`
                                )
                            }
                        >
                            <FaChair />
                            Ver mesas
                        </button>}

                        <button
                            type="button"
                            className="tags_resto_btn tags_resto_btn_primary"
                            onClick={openTable}
                        >
                            Abrir mesa
                        </button>

                        <button
                            type="button"
                            className="tags_resto_btn tags_resto_btn_primary"
                            disabled={refreshing}
                            onClick={() =>
                                loadWaiter({
                                    silent:
                                        true
                                })
                            }
                        >
                            <FaSyncAlt
                                className={
                                    refreshing
                                        ? "tags_resto_orders_rotating"
                                        : ""
                                }
                            />
                            Actualizar
                        </button>
                    </div>
                </div>
            </header>

            <section className="tags_resto_orders_stats">
                <div className="tags_resto_orders_stats_grid">
                    <div className="row">
                        {
                            statCards.map(({
                                key,
                                label,
                                description,
                                icon:
                                    Icon,
                                tone
                            }) => (
                                <div
                                    key={key}
                                    className="col-12 col-md-4"
                                >
                                    <article
                                        className={
                                            `tags_resto_orders_stat_card ` +
                                            `tags_resto_orders_stat_${tone}`
                                        }
                                    >
                                        <div className="tags_resto_orders_stat_icon">
                                            <Icon />
                                        </div>

                                        <div className="tags_resto_orders_stat_content">
                                            <div className="tags_resto_orders_stat_title">
                                                {label}
                                            </div>

                                            <div className="tags_resto_orders_stat_value">
                                                {Number(stats?.[key] || 0)}
                                            </div>

                                            {
                                                key === "deliveries" && (
                                                    <div className="tags_resto_orders_stat_secondary">
                                                        {Number(stats?.ready_items || 0)}
                                                        {" platos"}
                                                    </div>
                                                )
                                            }

                                            <div className="tags_resto_orders_stat_description">
                                                {description}
                                            </div>
                                        </div>
                                    </article>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </section>

            <section>
                <h2 className="h4 mb-3">
                    <FaFire className="me-2 text-warning" />
                    Pedidos en cocina
                </h2>

                <div className="row g-3">
                    {
                        kitchenOrders.map(
                            order => (
                                <div
                                    key={order.id}
                                    className="col-12 col-xl-6"
                                >
                                    <article className="tags_resto_order_card h-100">
                                        <OrderIdentity order={order} />

                                        <div className="list-group list-group-flush my-3">
                                            {
                                                order.items
                                                    .filter(
                                                        item =>
                                                            Number(
                                                                item.requires_preparation
                                                            ) === 1 &&
                                                            item.preparation_status ===
                                                            "sent"
                                                    )
                                                    .map(
                                                        item => (
                                                            <div
                                                                key={item.id}
                                                                className="list-group-item px-0 d-flex justify-content-between"
                                                            >
                                                                <span>
                                                                    {item.title}
                                                                </span>
                                                                <strong>
                                                                    ×{Number(item.quantity || 0)}
                                                                </strong>
                                                            </div>
                                                        )
                                                    )
                                            }
                                        </div>

                                        <div className="d-flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                className="tags_resto_btn tags_resto_btn_secondary"
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/businesses/${businessId}/resto/orders/${order.id}`
                                                    )
                                                }
                                            >
                                                <FaEye />
                                                Ver detalle
                                            </button>

                                            <button
                                                type="button"
                                                className="tags_resto_btn tags_resto_btn_warning"
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/businesses/${businessId}/resto/kitchen`
                                                    )
                                                }
                                            >
                                                <FaFire />
                                                Ver Cocina
                                            </button>
                                        </div>
                                    </article>
                                </div>
                            )
                        )
                    }

                    {
                        kitchenOrders.length === 0 && (
                            <p className="text-muted">
                                No hay pedidos actualmente en cocina.
                            </p>
                        )
                    }
                </div>
            </section>

            <section>
                <h2 className="h4 mb-3">
                    Solicitudes de habilitación
                </h2>

                <div className="row g-3">
                    {
                        tableRequests.map(
                            order => (
                                <div
                                    key={order.id}
                                    className="col-12 col-lg-6"
                                >
                                    <article className="tags_resto_order_card h-100">
                                        <OrderIdentity
                                            order={order}
                                            detail={
                                                order.customer_name
                                                    ? `${order.customer_name} solicita habilitación`
                                                    : "Cliente solicita habilitación"
                                            }
                                        />

                                        {can("tables.open") && <button
                                            type="button"
                                            className="tags_resto_btn tags_resto_btn_success tags_resto_btn_sm mt-3"
                                            disabled={
                                                Number(updatingOrderId) ===
                                                Number(order.id)
                                            }
                                            onClick={() =>
                                                runAction(
                                                    order,
                                                    "activate_session",
                                                    "La mesa quedó habilitada."
                                                )
                                            }
                                        >
                                            <FaCheck />
                                            Habilitar atención
                                        </button>}

                                        {can("orders.cancel") && <button
                                            type="button"
                                            className="tags_resto_btn tags_resto_btn_danger tags_resto_btn_sm mt-3 ms-2"
                                            onClick={() =>
                                                cancelPendingSession(
                                                    order
                                                )
                                            }
                                        >
                                            <FaTimes />
                                            Cancelar pedido
                                        </button>}
                                    </article>
                                </div>
                            )
                        )
                    }

                    {
                        tableRequests.length === 0 && (
                            <p className="text-muted">
                                No hay mesas ni ubicaciones esperando habilitación.
                            </p>
                        )
                    }
                </div>
            </section>

            <section>
                <h2 className="h4 mb-3">
                    Retiro y delivery por confirmar
                </h2>

                <div className="row g-3">
                    {
                        onlineOrders.map(
                            order => (
                                <div
                                    key={order.id}
                                    className="col-12 col-lg-6"
                                >
                                    <article className="tags_resto_order_card h-100">
                                        <OrderIdentity
                                            order={order}
                                            detail={
                                                `${order.customer_name || "Cliente"} · ` +
                                                (
                                                    order.service_mode ===
                                                        "delivery"
                                                        ? "Delivery"
                                                        : "Retiro"
                                                )
                                            }
                                        />

                                        {
                                            order.customer_address && (
                                                <p className="mb-2 mt-3">
                                                    {order.customer_address}
                                                </p>
                                            )
                                        }

                                        {can("tables.open") && <button
                                            type="button"
                                            className="tags_resto_btn tags_resto_btn_danger tags_resto_btn_sm"
                                            disabled={
                                                Number(updatingOrderId) ===
                                                Number(order.id)
                                            }
                                            onClick={() =>
                                                runAction(
                                                    order,
                                                    "confirm_order",
                                                    "El pedido fue confirmado."
                                                )
                                            }
                                        >
                                            <FaCheck />
                                            Confirmar pedido
                                        </button>}

                                        {can("orders.cancel") && <button
                                            type="button"
                                            className="tags_resto_btn tags_resto_btn_danger tags_resto_btn_sm ms-2"
                                            onClick={() =>
                                                cancelPendingSession(
                                                    order
                                                )
                                            }
                                        >
                                            <FaTimes />
                                            Cancelar pedido
                                        </button>}
                                    </article>
                                </div>
                            )
                        )
                    }

                    {
                        onlineOrders.length === 0 && (
                            <p className="text-muted">
                                No hay pedidos esperando confirmación.
                            </p>
                        )
                    }
                </div>
            </section>

            <section>
                <h2 className="h4 mb-3">
                    <FaFire className="me-2 text-success" />
                    Listos para entregar
                </h2>

                <div className="row g-3">
                    {
                        deliveries.map(
                            order => (
                                <div
                                    key={order.id}
                                    className="col-12 col-xl-6"
                                >
                                    <article className="tags_resto_order_card h-100">
                                        <OrderIdentity order={order} />

                                        <div className="list-group list-group-flush my-3">
                                            {
                                                order.ready_items.map(
                                                    item => (
                                                        <div
                                                            key={item.id}
                                                            className="list-group-item px-0 d-flex justify-content-between"
                                                        >
                                                            <span>
                                                                {item.title}
                                                            </span>
                                                            <strong>
                                                                ×{Number(item.quantity || 0)}
                                                            </strong>
                                                        </div>
                                                    )
                                                )
                                            }
                                        </div>

                                        {can("waiter.serve") && <button
                                            type="button"
                                            className="tags_resto_btn tags_resto_btn_primary"
                                            disabled={
                                                Number(updatingOrderId) ===
                                                Number(order.id)
                                            }
                                            onClick={() =>
                                                runAction(
                                                    order,
                                                    "serve_ready",
                                                    "Los platos fueron entregados."
                                                )
                                            }
                                        >
                                            <FaUtensils />
                                            Entregar pedido
                                        </button>}
                                    </article>
                                </div>
                            )
                        )
                    }

                    {
                        deliveries.length === 0 && (
                            <div className="col-12">
                                <div className="tags_resto_orders_empty">
                                    No hay platos listos para entregar.
                                </div>
                            </div>
                        )
                    }
                </div>
            </section>

            <section>
                <h2 className="h4 mb-3">
                    <FaBell className="me-2 text-danger" />
                    Llamados del cliente
                </h2>

                <div className="row g-3">
                    {
                        calls.map(
                            order => (
                                <div
                                    key={order.id}
                                    className="col-12 col-lg-6"
                                >
                                    <article className="tags_resto_order_card h-100 d-flex flex-row align-items-center justify-content-between gap-3">
                                        <OrderIdentity
                                            order={order}
                                            eventAt={
                                                order.staff_requested_at
                                            }
                                            eventLabel="Llamado"
                                            detail={
                                                order.staff_request_notes
                                            }
                                        />

                                        {can("waiter.resolve") && <button
                                            type="button"
                                            className="tags_resto_btn tags_resto_btn_primary tags_resto_btn_sm flex-shrink-0"
                                            disabled={
                                                Number(updatingOrderId) ===
                                                Number(order.id)
                                            }
                                            onClick={() =>
                                                runAction(
                                                    order,
                                                    "resolve_call",
                                                    "El llamado fue atendido."
                                                )
                                            }
                                        >
                                            <FaCheck />
                                            Marcar atendido
                                        </button>}
                                    </article>
                                </div>
                            )
                        )
                    }

                    {
                        calls.length === 0 && (
                            <p className="text-muted">
                                No hay llamados pendientes.
                            </p>
                        )
                    }
                </div>
            </section>

            <section>
                <h2 className="h4 mb-3">
                    <FaReceipt className="me-2 text-warning" />
                    Solicitudes de cuenta
                </h2>

                <div className="row g-3">
                    {
                        bills.map(
                            order => (
                                <div
                                    key={order.id}
                                    className="col-12 col-lg-6"
                                >
                                    <article className="tags_resto_order_card h-100">
                                        <OrderIdentity order={order} />

                                        <div className="d-flex justify-content-between my-3">
                                            <span>Saldo pendiente</span>
                                            <strong>
                                                {formatRestoOrderPrice(
                                                    order.pending_amount,
                                                    store?.currency ||
                                                    order.currency ||
                                                    "ARS"
                                                )}
                                            </strong>
                                        </div>

                                        <div className="d-flex flex-wrap gap-2">
                                            {can("orders.payment") && <button
                                                type="button"
                                                className="tags_resto_btn tags_resto_btn_success"
                                                disabled={
                                                    Number(updatingOrderId) ===
                                                    Number(order.id) ||
                                                    Number(order.pending_amount || 0) <= 0
                                                }
                                                onClick={() =>
                                                    registerPayment(
                                                        order
                                                    )
                                                }
                                            >
                                                <FaCashRegister />
                                                Registrar cobro
                                            </button>}

                                            {can("waiter.resolve") && <button
                                                type="button"
                                                className="tags_resto_btn tags_resto_btn_secondary"
                                                disabled={
                                                    Number(updatingOrderId) ===
                                                    Number(order.id)
                                                }
                                                onClick={() =>
                                                    runAction(
                                                        order,
                                                        "resolve_bill",
                                                        "La solicitud fue atendida."
                                                    )
                                                }
                                            >
                                                <FaCheck />
                                                Marcar atendida
                                            </button>}
                                        </div>
                                    </article>
                                </div>
                            )
                        )
                    }

                    {
                        bills.length === 0 && (
                            <p className="text-muted">
                                No hay solicitudes de cuenta.
                            </p>
                        )
                    }
                </div>
            </section>

            {
                can("tables.close") && (
                    <section>
                        <h2 className="h4 mb-3">
                            <FaCheck className="me-2 text-success" />
                            Pagadas para cerrar
                        </h2>

                        <div className="row g-3">
                            {
                                closableOrders.map(
                                    order => (
                                        <div
                                            key={order.id}
                                            className="col-12 col-lg-6"
                                        >
                                            <article className="tags_resto_order_card h-100">
                                                <OrderIdentity order={order} />

                                                <div className="d-flex flex-wrap gap-2 mt-3">
                                                    <button
                                                        type="button"
                                                        className="tags_resto_btn tags_resto_btn_secondary"
                                                        onClick={() =>
                                                            router.push(
                                                                `/dashboard/businesses/${businessId}/resto/orders/${order.id}`
                                                            )
                                                        }
                                                    >
                                                        <FaEye />
                                                        Ver detalle
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="tags_resto_btn tags_resto_btn_secondary"
                                                        disabled={
                                                            Number(updatingOrderId) ===
                                                            Number(order.id)
                                                        }
                                                        onClick={() =>
                                                            closeOrder(
                                                                order
                                                            )
                                                        }
                                                    >
                                                        <FaCheck />
                                                        Cerrar pedido
                                                    </button>
                                                </div>
                                            </article>
                                        </div>
                                    )
                                )
                            }

                            {
                                closableOrders.length === 0 && (
                                    <p className="text-muted">
                                        No hay mesas pagadas pendientes de cierre.
                                    </p>
                                )
                            }
                        </div>
                    </section>
                )
            }
        </main>
    );

}
