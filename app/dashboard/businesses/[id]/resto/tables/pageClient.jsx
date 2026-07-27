"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    useRouter
} from "next/navigation";

import {
    FaCheck,
    FaHome,
    FaTimes
} from "react-icons/fa";

import {
    FaCashRegister,
    FaChair,
    FaDoorOpen,
    FaEye,
    FaRotate
} from "react-icons/fa6";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import RestoLocationQR
    from "@/app/modules/resto/components/admin/locations/RestoLocationQR";

import showAlert
    from "@/app/components/showAlert";

import {
    formatRestoOrderPrice
} from "@/app/modules/resto/lib/orders";

import {
    requestRestoOrderCancellation
} from "@/app/modules/resto/lib/orders/requestRestoOrderCancellation";

import {
    requestRestoPayment
} from "@/app/modules/resto/lib/cash/requestRestoPayment";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/modules/resto/styles/orders/index.css";
import "@/app/modules/resto/styles/resto-location-qr.css";
import "@/app/modules/resto/styles/resto-tables.css";

function getTableStatus(order) {

    if (!order) {

        return [
            "Libre",
            "bg-success"
        ];

    }

    if (
        order.session_status ===
        "pending_activation"
    ) {

        return [
            "Esperando habilitación",
            "bg-warning text-dark"
        ];

    }

    if (order.bill_requested) {

        return [
            "Cuenta solicitada",
            "bg-warning text-dark"
        ];

    }

    if (
        order.payment_status ===
        "paid"
    ) {

        return [
            "Pagada · cerrar mesa",
            "bg-info text-dark"
        ];

    }

    const labels = {
        new:
            "Pedido abierto",
        preparing:
            "En cocina",
        ready:
            "Listo para entregar",
        served:
            "Entregado · pendiente de cobro"
    };

    return [
        labels[
            order.order_status
        ] ||
        "Ocupada",
        order.order_status ===
            "ready"
            ? "bg-primary"
            : "bg-secondary"
    ];

}

export default function RestoTablesClient({
    businessId,
    permissions = ["*"]
}) {

    const router =
        useRouter();

    const can =
        permission =>
            permissions.includes("*") ||
            permissions.includes(permission);

    const [
        locations,
        setLocations
    ] =
        useState([]);

    const [
        orders,
        setOrders
    ] =
        useState([]);

    const [
        loading,
        setLoading
    ] =
        useState(true);

    const [
        refreshing,
        setRefreshing
    ] =
        useState(false);

    const [
        updatingId,
        setUpdatingId
    ] =
        useState(null);

    const [
        openingId,
        setOpeningId
    ] =
        useState(null);

    const [
        customerName,
        setCustomerName
    ] =
        useState("");

    const loadTables =
        useCallback(
            async ({
                silent = false
            } = {}) => {

                silent
                    ? setRefreshing(true)
                    : setLoading(true);

                try {

                    const [
                        locationsResponse,
                        ordersResponse
                    ] =
                        await Promise.all([
                            fetch(
                                `/api/resto/admin/locations/list?businessId=${encodeURIComponent(
                                    businessId
                                )}`,
                                {
                                    cache: "no-store"
                                }
                            ),
                            fetch(
                                `/api/resto/admin/orders/list?businessId=${encodeURIComponent(
                                    businessId
                                )}&limit=500`,
                                {
                                    cache: "no-store"
                                }
                            )
                        ]);

                    const [
                        locationsData,
                        ordersData
                    ] =
                        await Promise.all([
                            locationsResponse.json(),
                            ordersResponse.json()
                        ]);

                    if (
                        !locationsResponse.ok ||
                        !ordersResponse.ok
                    ) {

                        throw new Error(
                            locationsData?.error ||
                            ordersData?.error ||
                            "No se pudieron cargar las mesas."
                        );

                    }

                    setLocations(
                        Array.isArray(
                            locationsData?.locations
                        )
                            ? locationsData.locations
                            : []
                    );

                    setOrders(
                        Array.isArray(
                            ordersData?.orders
                        )
                            ? ordersData.orders
                            : []
                    );

                } catch (error) {

                    showAlert({
                        icon: "error",
                        title: "Mesas",
                        text: error.message
                    });

                } finally {

                    setLoading(false);
                    setRefreshing(false);

                }

            },
            [
                businessId
            ]
        );

    useEffect(
        () => {

            loadTables();

        },
        [
            loadTables
        ]
    );

    useEffect(
        () => {

            const timer =
                window.setInterval(
                    () =>
                        loadTables({
                            silent: true
                        }),
                    10000
                );

            return () =>
                window.clearInterval(
                    timer
                );

        },
        [
            loadTables
        ]
    );

    const ordersByLocation =
        useMemo(
            () => {

                const map =
                    new Map();

                orders
                    .filter(
                        order =>
                            order.location_id &&
                            ![
                                "closed",
                                "cancelled"
                            ].includes(
                                order.session_status
                            )
                    )
                    .forEach(
                        order =>
                            map.set(
                                Number(
                                    order.location_id
                                ),
                                order
                            )
                    );

                return map;

            },
            [
                orders
            ]
        );

    const sectors =
        useMemo(
            () => {

                const operational =
                    locations.filter(
                        location =>
                            location.is_active &&
                            [
                                "table",
                                "counter",
                                "other"
                            ].includes(
                                location.location_type
                            )
                    );

                const rows =
                    locations
                        .filter(
                            location =>
                                location.location_type ===
                                "sector"
                        )
                        .map(
                            sector => ({
                                ...sector,
                                tables:
                                    operational.filter(
                                        location =>
                                            Number(
                                                location.parent_id
                                            ) ===
                                            Number(
                                                sector.id
                                            )
                                    )
                            })
                        );

                const ungrouped =
                    operational.filter(
                        location =>
                            !location.parent_id
                    );

                if (ungrouped.length) {

                    rows.push({
                        id: "ungrouped",
                        name: "Sin sector",
                        tables: ungrouped
                    });

                }

                return rows.filter(
                    sector =>
                        sector.tables.length
                );

            },
            [
                locations
            ]
        );

    async function waiterAction(
        order,
        action,
        extra = {}
    ) {

        setUpdatingId(order.id);

        try {

            const response =
                await fetch(
                    "/api/resto/admin/waiter",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                businessId,
                                orderId: order.id,
                                action,
                                ...extra
                            })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    "No se pudo actualizar la mesa."
                );

            }

            await loadTables({
                silent: true
            });

        } catch (error) {

            showAlert({
                icon: "error",
                title: "Mesa",
                text: error.message
            });

        } finally {

            setUpdatingId(null);

        }

    }

    async function openTable(location) {

        const name =
            customerName.trim();

        if (!name) {

            showAlert({
                icon: "info",
                title: "Nombre requerido",
                text: "Ingresá el nombre o referencia del cliente."
            });

            return;

        }

        setUpdatingId(location.id);

        try {

            const response =
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
                                    location.id,
                                customerName:
                                    name
                            })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    "No se pudo abrir la mesa."
                );

            }

            setOpeningId(null);
            setCustomerName("");

            await loadTables({
                silent: true
            });

        } catch (error) {

            showAlert({
                icon: "error",
                title: "Abrir mesa",
                text: error.message
            });

        } finally {

            setUpdatingId(null);

        }

    }

    async function registerPayment(order) {

        const payment =
            await requestRestoPayment(
                order,
                {
                    currency:
                        order.currency ||
                        "ARS"
                }
            );

        if (!payment) {

            return;

        }

        setUpdatingId(order.id);

        try {

            const response =
                await fetch(
                    "/api/resto/admin/orders/payment",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                businessId,
                                orderId: order.id,
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
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    "No se pudo registrar el cobro."
                );

            }

            await loadTables({
                silent: true
            });

        } catch (error) {

            showAlert({
                icon: "error",
                title: "Cobro",
                text: error.message
            });

        } finally {

            setUpdatingId(null);

        }

    }

    async function cancelOrder(order) {

        const cancellation =
            await requestRestoOrderCancellation(
                order
            );

        if (!cancellation) {
            return;
        }

        setUpdatingId(order.id);

        try {

            const response =
                await fetch(
                    "/api/resto/admin/orders/status",
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
                                order_status:
                                    "cancelled",
                                reason:
                                    cancellation.reason,
                                refund_amount:
                                    cancellation.refundAmount,
                                refund_method:
                                    cancellation.refundMethod
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
                    "No se pudo cancelar el pedido."
                );

            }

            await loadTables({
                silent:
                    true
            });

            showAlert({
                icon:
                    "success",
                title:
                    "Pedido cancelado",
                text:
                    cancellation.refundableAmount > 0
                        ? "La mesa quedó libre y la devolución fue registrada."
                        : "La mesa quedó libre y el pedido pasó al historial.",
                timer:
                    1500
            });

        } catch (error) {

            showAlert({
                icon:
                    "error",
                title:
                    "Cancelar pedido",
                text:
                    error.message ||
                    "No se pudo cancelar el pedido."
            });

        } finally {

            setUpdatingId(null);

        }

    }

    if (loading) {

        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );

    }

    return (
        <main className="tags_resto_orders_page tags_resto_tables_page">
            <header className="tags_resto_orders_header">
                <div className="tags_resto_orders_header_identity">
                    <div className="tags_resto_orders_header_icon">
                        <FaChair />
                    </div>
                    <div className="tags_resto_orders_header_content">
                        <h1 className="tags_resto_orders_title">
                            Mesas
                        </h1>
                        <p className="tags_resto_orders_subtitle">
                            Ocupación y sesiones por sector
                        </p>
                    </div>
                </div>

                <div className="tags_resto_btn_group">
                    <button
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
                    </button>
                    <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_primary"
                        disabled={refreshing}
                        onClick={() =>
                            loadTables({
                                silent: true
                            })
                        }
                    >
                        <FaRotate />
                        Actualizar
                    </button>
                </div>
            </header>

            {
                sectors.map(
                    sector => (
                        <section
                            key={sector.id}
                            className="mb-5"
                        >
                            <h2 className="h4 mb-3">
                                {sector.name}
                            </h2>

                            <div className="tags_resto_tables_grid">
                                {
                                    sector.tables.map(
                                        location => {

                                            const order =
                                                ordersByLocation.get(
                                                    Number(
                                                        location.id
                                                    )
                                                );

                                            const [
                                                statusLabel,
                                                statusClass
                                            ] =
                                                getTableStatus(
                                                    order
                                                );

                                            const updating =
                                                Number(
                                                    updatingId
                                                ) ===
                                                Number(
                                                    order?.id ||
                                                    location.id
                                                );

                                            return (
                                                <article
                                                    key={location.id}
                                                    className="tags_resto_order_card tags_resto_tables_card"
                                                >
                                                    <header className="d-flex justify-content-between gap-3">
                                                        <div>
                                                            <h3 className="h5 mb-1">
                                                                {location.name}
                                                            </h3>
                                                            <small>
                                                                Capacidad: {Number(location.capacity || 0) || "—"}
                                                            </small>
                                                        </div>
                                                        <span className={`badge ${statusClass}`}>
                                                            {statusLabel}
                                                        </span>
                                                    </header>

                                                    <RestoLocationQR
                                                        location={location}
                                                        compact
                                                    />

                                                    {
                                                        !order &&
                                                        can("tables.open") && (
                                                            <div className="mt-3">
                                                                {
                                                                    Number(openingId) ===
                                                                    Number(location.id)
                                                                        ? (
                                                                            <div className="d-grid gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control"
                                                                                    value={customerName}
                                                                                    autoFocus
                                                                                    placeholder="Nombre o referencia"
                                                                                    onChange={
                                                                                        event =>
                                                                                            setCustomerName(
                                                                                                event.target.value
                                                                                            )
                                                                                    }
                                                                                />
                                                                                <div className="d-flex gap-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        className="tags_resto_btn tags_resto_btn_success"
                                                                                        disabled={updating}
                                                                                        onClick={() =>
                                                                                            openTable(
                                                                                                location
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <FaCheck />
                                                                                        Confirmar
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        className="tags_resto_btn tags_resto_btn_secondary"
                                                                                        onClick={() => {
                                                                                            setOpeningId(null);
                                                                                            setCustomerName("");
                                                                                        }}
                                                                                    >
                                                                                        Cancelar
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                        : (
                                                                            <button
                                                                                type="button"
                                                                                className="tags_resto_btn tags_resto_btn_success"
                                                                                onClick={() =>
                                                                                    setOpeningId(
                                                                                        location.id
                                                                                    )
                                                                                }
                                                                            >
                                                                                <FaDoorOpen />
                                                                                Abrir mesa
                                                                            </button>
                                                                        )
                                                                }
                                                            </div>
                                                        )
                                                    }

                                                    {
                                                        order && (
                                                            <div className="mt-3">
                                                                <p className="mb-1">
                                                                    <strong>
                                                                        {order.customer_name || "Cliente"}
                                                                    </strong>
                                                                    {" · "}
                                                                    {order.order_number}
                                                                </p>
                                                                <p className="mb-3">
                                                                    Total: {
                                                                        formatRestoOrderPrice(
                                                                            order.total,
                                                                            order.currency ||
                                                                            "ARS"
                                                                        )
                                                                    }
                                                                    {" · "}
                                                                    Saldo: {
                                                                        formatRestoOrderPrice(
                                                                            order.pending_amount,
                                                                            order.currency ||
                                                                            "ARS"
                                                                        )
                                                                    }
                                                                </p>

                                                                <div className="tags_resto_tables_card_actions">
                                                                    {
                                                                        can("tables.open") &&
                                                                        order.session_status ===
                                                                        "pending_activation" && (
                                                                            <button
                                                                                type="button"
                                                                                className="tags_resto_btn tags_resto_btn_success"
                                                                                disabled={updating}
                                                                                onClick={() =>
                                                                                    waiterAction(
                                                                                        order,
                                                                                        "activate_session"
                                                                                    )
                                                                                }
                                                                            >
                                                                                <FaCheck />
                                                                                Habilitar atención
                                                                            </button>
                                                                        )
                                                                    }
                                                                    {can("orders.view") && <button
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
                                                                    </button>}
                                                                    {
                                                                        Number(
                                                                            order.pending_amount ||
                                                                            0
                                                                        ) > 0 &&
                                                                        can("orders.payment") && (
                                                                            <button
                                                                                type="button"
                                                                                className="tags_resto_btn tags_resto_btn_success"
                                                                                disabled={updating}
                                                                                onClick={() =>
                                                                                    registerPayment(
                                                                                        order
                                                                                    )
                                                                                }
                                                                            >
                                                                                <FaCashRegister />
                                                                                Registrar cobro
                                                                            </button>
                                                                        )
                                                                    }
                                                                    {can("tables.close") && <button
                                                                        type="button"
                                                                        className="tags_resto_btn tags_resto_btn_secondary"
                                                                        disabled={
                                                                            updating ||
                                                                            Number(order.pending_amount || 0) > 0 ||
                                                                            (
                                                                                Array.isArray(
                                                                                    order.items
                                                                                )
                                                                                    ? order.items
                                                                                    : []
                                                                            ).some(
                                                                                item =>
                                                                                    [
                                                                                        "pending",
                                                                                        "sent",
                                                                                        "ready"
                                                                                    ].includes(
                                                                                        item.preparation_status
                                                                                    )
                                                                            ) ||
                                                                            order.bill_requested ||
                                                                            order.staff_requested
                                                                        }
                                                                        onClick={async () => {
                                                                            const confirmed =
                                                                                await showAlert({
                                                                                    icon: "question",
                                                                                    title: "Cerrar pedido",
                                                                                    text: "La mesa quedará libre y el pedido pasará al historial.",
                                                                                    showCancelButton: true,
                                                                                    confirmButtonText: "Sí, cerrar"
                                                                                });
                                                                            if (confirmed) {
                                                                                waiterAction(
                                                                                    order,
                                                                                    "close_session"
                                                                                );
                                                                            }
                                                                        }}
                                                                    >
                                                                        <FaCheck />
                                                                        Cerrar pedido
                                                                    </button>}
                                                                    {can("orders.cancel") && <button
                                                                        type="button"
                                                                        className="tags_resto_btn tags_resto_btn_danger"
                                                                        disabled={updating}
                                                                        onClick={() =>
                                                                            cancelOrder(
                                                                                order
                                                                            )
                                                                        }
                                                                    >
                                                                        <FaTimes />
                                                                        Cancelar pedido
                                                                    </button>}
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                </article>
                                            );

                                        }
                                    )
                                }
                            </div>
                        </section>
                    )
                )
            }

            {
                sectors.length === 0 && (
                    <div className="tags_resto_orders_empty">
                        No hay mesas o ubicaciones activas configuradas.
                    </div>
                )
            }
        </main>
    );

}
