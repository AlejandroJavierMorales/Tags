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
    FaArrowLeft,
    FaCalendarAlt,
    FaCashRegister,
    FaCheckCircle,
    FaClock,
    FaEye,
    FaFilter,
    FaFire,
    FaHistory,
    FaHome,
    FaMoneyBillWave,
    FaSearch,
    FaSyncAlt,
    FaTimesCircle,
    FaUndoAlt,
    FaUtensils
} from "react-icons/fa";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import {
    formatRestoOrderDate,
    formatRestoOrderPrice,
    getRestoOrderLocationName,
    getRestoOrderServiceModeLabel
} from "@/app/modules/resto/lib/orders";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/modules/resto/styles/orders/index.css";
import "@/app/modules/resto/styles/orders/history.css";

const ORDER_STATUSES = [
    ["new", "Pendiente de enviar"],
    ["confirmed", "Confirmado"],
    ["preparing", "En cocina"],
    ["ready", "Listo para entregar"],
    ["served", "Entregado"],
    ["shipped", "Despachado"],
    ["completed", "Cerrado"],
    ["cancelled", "Cancelado"]
];

const SESSION_STATUSES = [
    ["pending_activation", "Esperando habilitación"],
    ["pending_confirmation", "Esperando confirmación"],
    ["open", "Abierto"],
    ["bill_requested", "Cuenta solicitada"],
    ["closed", "Cerrado"],
    ["cancelled", "Cancelado"]
];

const PAYMENT_STATUSES = [
    ["pending", "Pendiente de cobro"],
    ["partial", "Pago parcial"],
    ["paid", "Cobrado"],
    ["cancelled", "Pago cancelado"],
    ["refunded", "Reintegrado"]
];

const SERVICE_MODES = [
    ["table", "Consumo en el lugar"],
    ["takeaway", "Retiro"],
    ["delivery", "Delivery"]
];

const PERIODS = [
    ["today", "Hoy"],
    ["7", "Últimos 7 días"],
    ["30", "Últimos 30 días"],
    ["90", "Últimos 90 días"],
    ["365", "Último año"],
    ["all", "Todo el historial"],
    ["custom", "Período personalizado"]
];

const EMPTY_FILTERS = {
    lifecycle: "",
    orderStatus: "",
    sessionStatus: "",
    paymentStatus: "",
    serviceMode: "",
    location: ""
};

function parseDate(value) {

    if (!value) {
        return null;
    }

    const date =
        new Date(
            String(value).replace(" ", "T")
        );

    return Number.isNaN(date.getTime())
        ? null
        : date;

}

function inputDate(date) {

    const offset =
        date.getTimezoneOffset() * 60000;

    return new Date(
        date.getTime() - offset
    )
        .toISOString()
        .slice(0, 10);

}

function getOrderSearchText(order) {

    return [
        order.order_number,
        order.customer_name,
        order.customer_phone,
        order.location_name,
        order.parent_location_name,
        order.products_text,
        getRestoOrderServiceModeLabel(order)
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

}

function matchesLifecycle(order, lifecycle) {

    if (!lifecycle) {
        return true;
    }

    if (lifecycle === "active") {
        return ![
            "closed",
            "cancelled"
        ].includes(order.session_status);
    }

    return order.session_status === lifecycle;

}

function filterOrders(
    source,
    {
        query,
        filters
    },
    ignored = ""
) {

    const normalizedQuery =
        query.trim().toLowerCase();

    return source.filter(
        order => {

            if (
                normalizedQuery &&
                !getOrderSearchText(order).includes(normalizedQuery)
            ) {
                return false;
            }

            if (
                ignored !== "lifecycle" &&
                !matchesLifecycle(order, filters.lifecycle)
            ) {
                return false;
            }

            if (
                ignored !== "orderStatus" &&
                filters.orderStatus &&
                order.order_status !== filters.orderStatus
            ) {
                return false;
            }

            if (
                ignored !== "sessionStatus" &&
                filters.sessionStatus &&
                order.session_status !== filters.sessionStatus
            ) {
                return false;
            }

            if (
                ignored !== "paymentStatus" &&
                filters.paymentStatus &&
                order.payment_status !== filters.paymentStatus
            ) {
                return false;
            }

            if (
                ignored !== "serviceMode" &&
                filters.serviceMode &&
                order.service_mode !== filters.serviceMode
            ) {
                return false;
            }

            if (
                ignored !== "location" &&
                filters.location &&
                String(order.location_id || "") !== filters.location
            ) {
                return false;
            }

            return true;

        }
    );

}

function countBy(source, field) {

    return source.reduce(
        (result, order) => {

            const value =
                String(order[field] || "");

            result[value] =
                (result[value] || 0) + 1;

            return result;

        },
        {}
    );

}

function getStatusLabel(options, value, fallback) {

    return options.find(
        option => option[0] === value
    )?.[1] || fallback;

}

export default function RestoOrdersHistoryClient({
    businessId
}) {

    const router =
        useRouter();

    const [
        orders,
        setOrders
    ] = useState([]);

    const [
        query,
        setQuery
    ] = useState("");

    const [
        period,
        setPeriod
    ] = useState("today");

    const [
        customFrom,
        setCustomFrom
    ] = useState("");

    const [
        customTo,
        setCustomTo
    ] = useState("");

    const [
        filters,
        setFilters
    ] = useState(EMPTY_FILTERS);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        refreshing,
        setRefreshing
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const loadHistory =
        useCallback(
            async ({
                silent = false
            } = {}) => {

                silent
                    ? setRefreshing(true)
                    : setLoading(true);

                setError("");

                try {

                    const allOrders = [];
                    let page = 1;
                    let totalPages = 1;

                    do {

                        const response =
                            await fetch(
                                `/api/resto/admin/orders/list?businessId=${encodeURIComponent(
                                    businessId
                                )}&limit=500&page=${page}`,
                                {
                                    cache: "no-store"
                                }
                            );

                        const data =
                            await response.json();

                        if (!response.ok) {
                            throw new Error(
                                data?.error ||
                                "No se pudo cargar el historial."
                            );
                        }

                        allOrders.push(
                            ...(
                                Array.isArray(data?.orders)
                                    ? data.orders
                                    : []
                            )
                        );

                        totalPages =
                            Math.max(
                                1,
                                Number(data?.pagination?.totalPages) || 1
                            );

                        page += 1;

                    } while (page <= totalPages);

                    setOrders(
                        Array.from(
                            new Map(
                                allOrders.map(
                                    order => [
                                        String(order.id),
                                        order
                                    ]
                                )
                            ).values()
                        )
                    );

                } catch (loadError) {

                    setError(
                        loadError?.message ||
                        "No se pudo cargar el historial."
                    );

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
            loadHistory();
        },
        [
            loadHistory
        ]
    );

    const periodRows =
        useMemo(
            () => {

                if (period === "all") {
                    return orders;
                }

                const end =
                    period === "custom" && customTo
                        ? new Date(`${customTo}T23:59:59.999`)
                        : new Date();

                let start;

                if (period === "custom") {

                    start =
                        customFrom
                            ? new Date(`${customFrom}T00:00:00`)
                            : null;

                } else {

                    start =
                        new Date();

                    start.setHours(0, 0, 0, 0);
                    if (
                        period !==
                        "today"
                    ) {
                        start.setDate(
                            start.getDate() -
                            Number(period) +
                            1
                        );
                    }

                }

                return orders.filter(
                    order => {

                        const date =
                            parseDate(order.created_at);

                        if (!date) {
                            return false;
                        }

                        return (
                            (!start || date >= start) &&
                            (!end || date <= end)
                        );

                    }
                );

            },
            [
                orders,
                period,
                customFrom,
                customTo
            ]
        );

    const rows =
        useMemo(
            () =>
                filterOrders(
                    periodRows,
                    {
                        query,
                        filters
                    }
                )
                    .sort(
                        (a, b) =>
                            (
                                parseDate(b.created_at)?.getTime() || 0
                            ) -
                            (
                                parseDate(a.created_at)?.getTime() || 0
                            )
                    ),
            [
                periodRows,
                query,
                filters
            ]
        );

    const counts =
        useMemo(
            () => ({
                lifecycle: {
                    active:
                        filterOrders(
                            periodRows,
                            {
                                query,
                                filters
                            },
                            "lifecycle"
                        ).filter(
                            order =>
                                matchesLifecycle(order, "active")
                        ).length,
                    closed:
                        filterOrders(
                            periodRows,
                            {
                                query,
                                filters
                            },
                            "lifecycle"
                        ).filter(
                            order =>
                                order.session_status === "closed"
                        ).length,
                    cancelled:
                        filterOrders(
                            periodRows,
                            {
                                query,
                                filters
                            },
                            "lifecycle"
                        ).filter(
                            order =>
                                order.session_status === "cancelled"
                        ).length
                },
                orderStatus:
                    countBy(
                        filterOrders(
                            periodRows,
                            {
                                query,
                                filters
                            },
                            "orderStatus"
                        ),
                        "order_status"
                    ),
                sessionStatus:
                    countBy(
                        filterOrders(
                            periodRows,
                            {
                                query,
                                filters
                            },
                            "sessionStatus"
                        ),
                        "session_status"
                    ),
                paymentStatus:
                    countBy(
                        filterOrders(
                            periodRows,
                            {
                                query,
                                filters
                            },
                            "paymentStatus"
                        ),
                        "payment_status"
                    ),
                serviceMode:
                    countBy(
                        filterOrders(
                            periodRows,
                            {
                                query,
                                filters
                            },
                            "serviceMode"
                        ),
                        "service_mode"
                    ),
                location:
                    countBy(
                        filterOrders(
                            periodRows,
                            {
                                query,
                                filters
                            },
                            "location"
                        ),
                        "location_id"
                    )
            }),
            [
                periodRows,
                query,
                filters
            ]
        );

    const locations =
        useMemo(
            () =>
                Array.from(
                    new Map(
                        periodRows
                            .filter(
                                order =>
                                    order.location_id &&
                                    getRestoOrderLocationName(order)
                            )
                            .map(
                                order => [
                                    String(order.location_id),
                                    getRestoOrderLocationName(order)
                                ]
                            )
                    ).entries()
                )
                    .sort(
                        (a, b) =>
                            a[1].localeCompare(b[1])
                    ),
            [
                periodRows
            ]
        );

    const summary =
        useMemo(
            () => ({
                total:
                    rows.length,
                active:
                    rows.filter(
                        order =>
                            matchesLifecycle(order, "active")
                    ).length,
                kitchen:
                    rows.filter(
                        order =>
                            order.order_status === "preparing"
                    ).length,
                ready:
                    rows.filter(
                        order =>
                            order.order_status === "ready"
                    ).length,
                paid:
                    rows.filter(
                        order =>
                            order.payment_status === "paid"
                    ).length,
                paymentPending:
                    rows.filter(
                        order =>
                            matchesLifecycle(
                                order,
                                "active"
                            ) &&
                            [
                                "pending",
                                "partial"
                            ].includes(order.payment_status)
                    ).length,
                closed:
                    rows.filter(
                        order =>
                            order.session_status === "closed"
                    ).length,
                cancelled:
                    rows.filter(
                        order =>
                            order.session_status === "cancelled"
                    ).length,
                income:
                    rows.reduce(
                        (total, order) =>
                            total +
                            Number(order.paid_total || 0),
                        0
                    ),
                refunds:
                    rows.reduce(
                        (total, order) =>
                            total +
                            Number(order.refunded_total || 0),
                        0
                    )
            }),
            [
                rows
            ]
        );

    function updateFilter(name, value) {

        setFilters(
            current => ({
                ...current,
                [name]: value
            })
        );

    }

    function resetFilters() {

        setQuery("");
        setFilters(EMPTY_FILTERS);

    }

    function selectPeriod(value) {

        setPeriod(value);

        if (
            value === "custom" &&
            !customFrom &&
            !customTo
        ) {

            const today =
                new Date();

            const from =
                new Date();

            from.setDate(
                from.getDate() - 29
            );

            setCustomFrom(
                inputDate(from)
            );

            setCustomTo(
                inputDate(today)
            );

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
        <main className="tags_resto_orders_page tags_resto_history_page">
            <header className="tags_resto_orders_header">
                <div className="tags_resto_orders_header_identity">
                    <div className="tags_resto_orders_header_icon">
                        <FaHistory />
                    </div>

                    <div className="tags_resto_orders_header_content">
                        <h1 className="tags_resto_orders_title">
                            Historial de pedidos
                        </h1>

                        <p className="tags_resto_orders_subtitle">
                            Todos los pedidos, estados y formas de atención
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
                        className="tags_resto_btn tags_resto_btn_secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/resto/orders`
                            )
                        }
                    >
                        <FaArrowLeft />
                        Pedidos activos
                    </button>

                    <button
                        type="button"
                        className="tags_resto_btn tags_resto_btn_primary"
                        disabled={refreshing}
                        onClick={() =>
                            loadHistory({
                                silent: true
                            })
                        }
                    >
                        <FaSyncAlt className={refreshing ? "tags_resto_history_spinning" : ""} />
                        Actualizar
                    </button>
                </div>
            </header>

            {
                error && (
                    <div className="tags_resto_history_error">
                        {error}
                    </div>
                )
            }

            <section className="tags_resto_history_kpis">
                <article className="tags_resto_history_kpi">
                    <FaHistory />
                    <div>
                        <strong>{summary.total}</strong>
                        <span>Pedidos</span>
                    </div>
                </article>

                <article className="tags_resto_history_kpi is-active">
                    <FaClock />
                    <div>
                        <strong>{summary.active}</strong>
                        <span>Activos</span>
                    </div>
                </article>

                <article className="tags_resto_history_kpi is-kitchen">
                    <FaFire />
                    <div>
                        <strong>{summary.kitchen}</strong>
                        <span>En cocina</span>
                    </div>
                </article>

                <article className="tags_resto_history_kpi is-ready">
                    <FaUtensils />
                    <div>
                        <strong>{summary.ready}</strong>
                        <span>Listos</span>
                    </div>
                </article>

                <article className="tags_resto_history_kpi is-paid">
                    <FaCashRegister />
                    <div>
                        <strong>{summary.paid}</strong>
                        <span>Cobrados</span>
                    </div>
                </article>

                <article className="tags_resto_history_kpi is-pending">
                    <FaClock />
                    <div>
                        <strong>{summary.paymentPending}</strong>
                        <span>Cobro pendiente</span>
                    </div>
                </article>

                <article className="tags_resto_history_kpi is-closed">
                    <FaCheckCircle />
                    <div>
                        <strong>{summary.closed}</strong>
                        <span>Cerrados</span>
                    </div>
                </article>

                <article className="tags_resto_history_kpi is-cancelled">
                    <FaTimesCircle />
                    <div>
                        <strong>{summary.cancelled}</strong>
                        <span>Cancelados</span>
                    </div>
                </article>
            </section>

            <section className="tags_resto_history_money_kpis">
                <article className="tags_resto_history_money_kpi is-income">
                    <div>
                        <FaMoneyBillWave />
                    </div>
                    <span>Total ingresado</span>
                    <strong>
                        {
                            formatRestoOrderPrice(
                                summary.income,
                                rows[0]?.currency || "ARS"
                            )
                        }
                    </strong>
                    <small>Cobros registrados</small>
                </article>

                <article className="tags_resto_history_money_kpi is-refund">
                    <div>
                        <FaUndoAlt />
                    </div>
                    <span>Devoluciones</span>
                    <strong>
                        {
                            formatRestoOrderPrice(
                                summary.refunds,
                                rows[0]?.currency || "ARS"
                            )
                        }
                    </strong>
                    <small>Dinero reintegrado</small>
                </article>

                <article className="tags_resto_history_money_kpi is-net">
                    <div>
                        <FaCashRegister />
                    </div>
                    <span>Neto ingresado</span>
                    <strong>
                        {
                            formatRestoOrderPrice(
                                summary.income -
                                summary.refunds,
                                rows[0]?.currency || "ARS"
                            )
                        }
                    </strong>
                    <small>Ingresos menos devoluciones</small>
                </article>
            </section>

            <section className="tags_resto_history_filters">
                <div className="tags_resto_history_filters_title">
                    <div>
                        <FaFilter />
                        <strong>Filtros</strong>
                    </div>

                    <button
                        type="button"
                        onClick={resetFilters}
                    >
                        Limpiar filtros
                    </button>
                </div>

                <div className="tags_resto_history_filter_grid">
                    <label className="tags_resto_history_field tags_resto_history_search">
                        <span>Buscar</span>
                        <div>
                            <FaSearch />
                            <input
                                type="search"
                                value={query}
                                placeholder="Pedido, cliente, mesa o producto..."
                                onChange={
                                    event =>
                                        setQuery(event.target.value)
                                }
                            />
                        </div>
                    </label>

                    <label className="tags_resto_history_field">
                        <span>Período</span>
                        <select
                            value={period}
                            onChange={
                                event =>
                                    selectPeriod(event.target.value)
                            }
                        >
                            {
                                PERIODS.map(
                                    option => (
                                        <option
                                            key={option[0]}
                                            value={option[0]}
                                        >
                                            {option[1]}
                                        </option>
                                    )
                                )
                            }
                        </select>
                    </label>

                    {
                        period === "custom" && (
                            <>
                                <label className="tags_resto_history_field">
                                    <span>Desde</span>
                                    <div className="tags_resto_history_date">
                                        <FaCalendarAlt />
                                        <input
                                            type="date"
                                            value={customFrom}
                                            max={customTo || undefined}
                                            onChange={
                                                event =>
                                                    setCustomFrom(event.target.value)
                                            }
                                        />
                                    </div>
                                </label>

                                <label className="tags_resto_history_field">
                                    <span>Hasta</span>
                                    <div className="tags_resto_history_date">
                                        <FaCalendarAlt />
                                        <input
                                            type="date"
                                            value={customTo}
                                            min={customFrom || undefined}
                                            onChange={
                                                event =>
                                                    setCustomTo(event.target.value)
                                            }
                                        />
                                    </div>
                                </label>
                            </>
                        )
                    }

                    <label className="tags_resto_history_field">
                        <span>Situación</span>
                        <select
                            value={filters.lifecycle}
                            onChange={
                                event =>
                                    updateFilter("lifecycle", event.target.value)
                            }
                        >
                            <option value="">Todas ({periodRows.length})</option>
                            <option value="active">Activos ({counts.lifecycle.active})</option>
                            <option value="closed">Cerrados ({counts.lifecycle.closed})</option>
                            <option value="cancelled">Cancelados ({counts.lifecycle.cancelled})</option>
                        </select>
                    </label>

                    <label className="tags_resto_history_field">
                        <span>Estado del pedido</span>
                        <select
                            value={filters.orderStatus}
                            onChange={
                                event =>
                                    updateFilter("orderStatus", event.target.value)
                            }
                        >
                            <option value="">Todos</option>
                            {
                                ORDER_STATUSES.map(
                                    option => (
                                        <option
                                            key={option[0]}
                                            value={option[0]}
                                        >
                                            {option[1]} ({counts.orderStatus[option[0]] || 0})
                                        </option>
                                    )
                                )
                            }
                        </select>
                    </label>

                    <label className="tags_resto_history_field">
                        <span>Estado de la sesión</span>
                        <select
                            value={filters.sessionStatus}
                            onChange={
                                event =>
                                    updateFilter("sessionStatus", event.target.value)
                            }
                        >
                            <option value="">Todos</option>
                            {
                                SESSION_STATUSES.map(
                                    option => (
                                        <option
                                            key={option[0]}
                                            value={option[0]}
                                        >
                                            {option[1]} ({counts.sessionStatus[option[0]] || 0})
                                        </option>
                                    )
                                )
                            }
                        </select>
                    </label>

                    <label className="tags_resto_history_field">
                        <span>Estado del cobro</span>
                        <select
                            value={filters.paymentStatus}
                            onChange={
                                event =>
                                    updateFilter("paymentStatus", event.target.value)
                            }
                        >
                            <option value="">Todos</option>
                            {
                                PAYMENT_STATUSES.map(
                                    option => (
                                        <option
                                            key={option[0]}
                                            value={option[0]}
                                        >
                                            {option[1]} ({counts.paymentStatus[option[0]] || 0})
                                        </option>
                                    )
                                )
                            }
                        </select>
                    </label>

                    <label className="tags_resto_history_field">
                        <span>Modalidad</span>
                        <select
                            value={filters.serviceMode}
                            onChange={
                                event =>
                                    updateFilter("serviceMode", event.target.value)
                            }
                        >
                            <option value="">Todas</option>
                            {
                                SERVICE_MODES.map(
                                    option => (
                                        <option
                                            key={option[0]}
                                            value={option[0]}
                                        >
                                            {option[1]} ({counts.serviceMode[option[0]] || 0})
                                        </option>
                                    )
                                )
                            }
                        </select>
                    </label>

                    {
                        locations.length > 0 && (
                            <label className="tags_resto_history_field">
                                <span>Sector / mesa</span>
                                <select
                                    value={filters.location}
                                    onChange={
                                        event =>
                                            updateFilter("location", event.target.value)
                                    }
                                >
                                    <option value="">Todos</option>
                                    {
                                        locations.map(
                                            location => (
                                                <option
                                                    key={location[0]}
                                                    value={location[0]}
                                                >
                                                    {location[1]} ({counts.location[location[0]] || 0})
                                                </option>
                                            )
                                        )
                                    }
                                </select>
                            </label>
                        )
                    }
                </div>
            </section>

            <div className="tags_resto_history_results">
                <div>
                    <strong>{rows.length}</strong>
                    {" "}
                    {rows.length === 1 ? "pedido encontrado" : "pedidos encontrados"}
                </div>

                <span>
                    {
                        getStatusLabel(
                            PERIODS,
                            period,
                            "Período seleccionado"
                        )
                    }
                </span>
            </div>

            {
                rows.length === 0
                    ? (
                        <section className="tags_resto_history_empty">
                            <FaHistory />
                            <h2>No hay pedidos con estos filtros</h2>
                            <p>
                                Cambiá el período o limpiá alguno de los filtros.
                            </p>
                        </section>
                    )
                    : (
                        <section className="tags_resto_history_grid">
                            {
                                rows.map(
                                    order => {

                                        const location =
                                            getRestoOrderLocationName(order) ||
                                            getRestoOrderServiceModeLabel(order);

                                        return (
                                            <article
                                                key={order.id}
                                                className="tags_resto_history_card"
                                            >
                                                <header className="tags_resto_history_card_header">
                                                    <div>
                                                        <strong>
                                                            {order.order_number || `#${order.id}`}
                                                        </strong>
                                                        <span>{location}</span>
                                                    </div>

                                                    <span className={`tags_resto_history_badge is-${order.order_status || "new"}`}>
                                                        {
                                                            getStatusLabel(
                                                                ORDER_STATUSES,
                                                                order.order_status,
                                                                "Pendiente"
                                                            )
                                                        }
                                                    </span>
                                                </header>

                                                <div className="tags_resto_history_card_body">
                                                    <div className="tags_resto_history_card_customer">
                                                        <strong>
                                                            {order.customer_name || "Cliente sin identificar"}
                                                        </strong>
                                                        <span>
                                                            {
                                                                getRestoOrderServiceModeLabel(order)
                                                            }
                                                        </span>
                                                    </div>

                                                    <p className="tags_resto_history_products">
                                                        {order.products_text || "Sin productos"}
                                                    </p>

                                                    <div className="tags_resto_history_card_meta">
                                                        <span className={`tags_resto_history_payment is-${order.payment_status || "pending"}`}>
                                                            {
                                                                getStatusLabel(
                                                                    PAYMENT_STATUSES,
                                                                    order.payment_status,
                                                                    "Pendiente de cobro"
                                                                )
                                                            }
                                                        </span>

                                                        <span>
                                                            {
                                                                getStatusLabel(
                                                                    SESSION_STATUSES,
                                                                    order.session_status,
                                                                    "Abierto"
                                                                )
                                                            }
                                                        </span>
                                                    </div>
                                                </div>

                                                <footer className="tags_resto_history_card_footer">
                                                    <div>
                                                        <strong>
                                                            {
                                                                formatRestoOrderPrice(
                                                                    order.total,
                                                                    order.currency || "ARS"
                                                                )
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                formatRestoOrderDate(
                                                                    order.created_at
                                                                )
                                                            }
                                                        </span>
                                                    </div>

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
                                                </footer>
                                            </article>
                                        );

                                    }
                                )
                            }
                        </section>
                    )
            }
        </main>
    );

}
