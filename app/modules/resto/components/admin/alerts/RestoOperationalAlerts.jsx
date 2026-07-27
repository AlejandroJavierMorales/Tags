"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import {
    useRouter
} from "next/navigation";
import {
    FaBell,
    FaBellSlash,
    FaChair,
    FaCheckDouble,
    FaChevronRight,
    FaClipboardCheck,
    FaCommentDots,
    FaConciergeBell,
    FaEye,
    FaExclamationTriangle,
    FaFire,
    FaMotorcycle,
    FaReceipt,
    FaRoute,
    FaTruck,
    FaWallet,
    FaTimes
} from "react-icons/fa";

import "@/app/modules/resto/styles/resto-operational-alerts.css";

const ACTIVE_STATUSES =
    new Set([
        "pending_activation",
        "pending_confirmation",
        "open",
        "active",
        "preparing",
        "ready",
        "delivered",
        "bill_requested"
    ]);

function number(value) {
    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}

function locationLabel(order) {
    const location =
        order.location_name ||
        order.table_name ||
        "";

    const sector =
        order.parent_location_name ||
        "";

    if (location && sector) {
        return `${sector} · ${location}`;
    }

    return (
        location ||
        order.customer_name ||
        "Pedido"
    );
}

function orderLabel(order) {
    return (
        order.order_number ||
        `Pedido ${order.id}`
    );
}

function buildAlerts(
    orders,
    deliveries,
    can
) {
    const alerts = [];

    orders
        .filter(
            order =>
                ACTIVE_STATUSES.has(
                    order.session_status
                )
        )
        .forEach(order => {
            const base = {
                orderId:
                    order.id,
                order:
                    orderLabel(order),
                location:
                    locationLabel(order)
            };

            if (
                can("tables.open") &&
                [
                    "pending_activation",
                    "pending_confirmation"
                ].includes(
                    order.session_status
                )
            ) {
                alerts.push({
                    ...base,
                    id:
                        `confirmation:${order.id}:${order.session_status}`,
                    type:
                        "confirmation",
                    priority:
                        1,
                    title:
                        order.session_status ===
                            "pending_activation"
                            ? "Mesa esperando habilitación"
                            : "Pedido esperando confirmación",
                    detail:
                        `${base.location} · ${base.order}`,
                    route:
                        `/orders/${order.id}`,
                    Icon:
                        FaClipboardCheck
                });
            }

            if (
                can("waiter.resolve") &&
                order.staff_requested
            ) {
                alerts.push({
                    ...base,
                    id:
                        `waiter:${order.id}:${order.staff_requested_at || "pending"}`,
                    type:
                        "waiter",
                    priority:
                        1,
                    title:
                        "Llamado al personal",
                    detail:
                        order.staff_request_notes ||
                        `${base.location} · ${base.order}`,
                    meta:
                        order.staff_request_notes
                            ? `${base.location} · ${base.order}`
                            : "",
                    route:
                        "/waiter",
                    Icon:
                        FaConciergeBell
                });
            }

            if (
                can("waiter.resolve") &&
                order.bill_requested
            ) {
                alerts.push({
                    ...base,
                    id:
                        `bill:${order.id}:${order.bill_requested_at || "pending"}`,
                    type:
                        "bill",
                    priority:
                        1,
                    title:
                        "Cuenta solicitada",
                    detail:
                        `${base.location} · ${base.order}`,
                    route:
                        `/orders/${order.id}`,
                    Icon:
                        FaReceipt
                });
            }

            const unread =
                number(
                    order.unread_message_count
                );

            if (
                can("orders.view") &&
                (
                    unread > 0 ||
                    order.has_unanswered_messages
                )
            ) {
                alerts.push({
                    ...base,
                    id:
                        `message:${order.id}:${order.last_message_at || unread}`,
                    type:
                        "message",
                    priority:
                        2,
                    title:
                        unread > 0
                            ? `${unread} mensaje${unread === 1 ? "" : "s"} nuevo${unread === 1 ? "" : "s"}`
                            : "Mensaje sin responder",
                    detail:
                        `${base.location} · ${base.order}`,
                    route:
                        `/orders/${order.id}`,
                    Icon:
                        FaCommentDots
                });
            }

            const ready =
                number(
                    order.kitchen?.ready
                );

            const pending =
                number(
                    order.kitchen?.pending
                );

            const pendingKitchenItems =
                Array.isArray(
                    order.items
                )
                    ? order.items.filter(
                        item =>
                            number(
                                item.requires_preparation
                            ) === 1 &&
                            item.preparation_status ===
                                "pending"
                    )
                    : [];

            const pendingKitchenBatch =
                pendingKitchenItems.reduce(
                    (maximum, item) =>
                        Math.max(
                            maximum,
                            number(item.id)
                        ),
                    0
                );

            if (
                can("orders.items") &&
                pending > 0
            ) {
                alerts.push({
                    ...base,
                    id:
                        `new-items:${order.id}:${pendingKitchenBatch}:${pending}`,
                    type:
                        "new-items",
                    priority:
                        1,
                    title:
                        `${pending} producto${pending === 1 ? "" : "s"} nuevo${pending === 1 ? "" : "s"} sin enviar`,
                    detail:
                        `${base.location} · ${base.order}`,
                    meta:
                        "Esperando envío a cocina",
                    route:
                        `/orders/${order.id}`,
                    Icon:
                        FaClipboardCheck
                });
            }

            const directDeliveryItems =
                Array.isArray(
                    order.items
                )
                    ? order.items.filter(
                        item =>
                            number(
                                item.requires_preparation
                            ) === 0 &&
                            [
                                "pending",
                                "ready"
                            ].includes(
                                item.preparation_status
                            )
                    )
                    : [];

            const directDeliveryUnits =
                directDeliveryItems.reduce(
                    (total, item) =>
                        total +
                        number(
                            item.quantity
                        ),
                    0
                );

            const directDeliveryBatch =
                directDeliveryItems.reduce(
                    (maximum, item) =>
                        Math.max(
                            maximum,
                            number(item.id)
                        ),
                    0
                );

            if (
                (
                    can("waiter.serve") ||
                    can("orders.deliver") ||
                    can("orders.items")
                ) &&
                directDeliveryUnits > 0
            ) {
                alerts.push({
                    ...base,
                    id:
                        `direct-delivery:${order.id}:${directDeliveryBatch}:${directDeliveryUnits}`,
                    type:
                        "ready",
                    priority:
                        1,
                    title:
                        `${directDeliveryUnits} producto${directDeliveryUnits === 1 ? "" : "s"} pendiente${directDeliveryUnits === 1 ? "" : "s"} de entrega`,
                    detail:
                        `${base.location} · ${base.order}`,
                    meta:
                        "No requiere preparación en cocina",
                    route:
                        `/orders/${order.id}`,
                    Icon:
                        FaChair
                });
            }

            if (
                (
                    can("waiter.serve") ||
                    can("orders.deliver")
                ) &&
                ready > 0
            ) {
                alerts.push({
                    ...base,
                    id:
                        `ready:${order.id}:${ready}`,
                    type:
                        "ready",
                    priority:
                        2,
                    title:
                        `${ready} plato${ready === 1 ? "" : "s"} listo${ready === 1 ? "" : "s"} para entregar`,
                    detail:
                        `${base.location} · ${base.order}`,
                    route:
                        `/orders/${order.id}`,
                    Icon:
                        FaChair
                });
            }

            const preparing =
                number(
                    order.kitchen?.sent
                );

            if (
                can("kitchen.ready") &&
                preparing > 0
            ) {
                alerts.push({
                    ...base,
                    id:
                        `kitchen:${order.id}:${preparing}`,
                    type:
                        "kitchen",
                    priority:
                        3,
                    title:
                        `${preparing} plato${preparing === 1 ? "" : "s"} en preparación`,
                    detail:
                        `${base.location} · ${base.order}`,
                    route:
                        "/kitchen",
                    Icon:
                        FaFire
                });
            }
        });

    deliveries.forEach(
        delivery => {
            const order =
                delivery.order_number ||
                `Pedido ${delivery.session_id}`;

            const customer =
                delivery.customer_name ||
                "Cliente";

            const route =
                "/delivery";

            if (
                can("delivery.assign") &&
                delivery.status ===
                    "ready_for_dispatch" &&
                !delivery.assigned_staff_id
            ) {
                alerts.push({
                    id:
                        `delivery-unassigned:${delivery.id}:${delivery.ready_at || delivery.updated_at}`,
                    type:
                        "delivery",
                    priority:
                        1,
                    title:
                        "Delivery listo sin repartidor",
                    detail:
                        `${customer} · ${order}`,
                    meta:
                        delivery.customer_address ||
                        "",
                    route,
                    Icon:
                        FaTruck
                });
            }

            if (
                can("delivery.status") &&
                [
                    "ready_for_dispatch",
                    "assigned"
                ].includes(
                    delivery.status
                )
            ) {
                alerts.push({
                    id:
                        `delivery-dispatch:${delivery.id}:${delivery.status}:${delivery.assigned_at || delivery.ready_at}`,
                    type:
                        "delivery",
                    priority:
                        2,
                    title:
                        delivery.assigned_staff_id
                            ? "Pedido listo para retirar"
                            : "Pedido listo para despachar",
                    detail:
                        `${customer} · ${order}`,
                    meta:
                        delivery.driver_name ||
                        delivery.customer_address ||
                        "",
                    route,
                    Icon:
                        FaMotorcycle
                });
            }

            if (
                can("delivery.status") &&
                delivery.status ===
                    "in_transit"
            ) {
                alerts.push({
                    id:
                        `delivery-transit:${delivery.id}:${delivery.in_transit_at}`,
                    type:
                        "delivery",
                    priority:
                        3,
                    title:
                        "Entrega en camino",
                    detail:
                        `${customer} · ${order}`,
                    meta:
                        delivery.driver_name ||
                        "",
                    route,
                    Icon:
                        FaRoute
                });
            }

            if (
                can("delivery.assign") &&
                delivery.status ===
                    "failed"
            ) {
                alerts.push({
                    id:
                        `delivery-failed:${delivery.id}:${delivery.failed_at}`,
                    type:
                        "delivery",
                    priority:
                        1,
                    title:
                        "Entrega con incidencia",
                    detail:
                        `${customer} · ${order}`,
                    meta:
                        delivery.issue_notes ||
                        "Requiere intervención",
                    route,
                    Icon:
                        FaExclamationTriangle
                });
            }

            const pendingRemittance =
                Math.max(
                    number(
                        delivery.collected_amount
                    ) -
                    number(
                        delivery.remitted_amount
                    ),
                    0
                );

            if (
                can("delivery.remittance") &&
                pendingRemittance > 0
            ) {
                alerts.push({
                    id:
                        `delivery-remittance:${delivery.id}:${pendingRemittance}`,
                    type:
                        "delivery",
                    priority:
                        2,
                    title:
                        "Cobranza pendiente de rendición",
                    detail:
                        `${delivery.driver_name || "Repartidor"} · ${order}`,
                    meta:
                        `$ ${pendingRemittance.toLocaleString("es-AR")}`,
                    route,
                    Icon:
                        FaWallet
                });
            }
        }
    );

    return alerts.sort(
        (left, right) =>
            left.priority -
            right.priority
    );
}

export default function RestoOperationalAlerts({
    businessId,
    permissions = []
}) {
    const router =
        useRouter();

    const [orders, setOrders] =
        useState([]);
    const [deliveries, setDeliveries] =
        useState([]);
    const [open, setOpen] =
        useState(false);
    const [loading, setLoading] =
        useState(true);
    const [soundEnabled, setSoundEnabled] =
        useState(true);
    const [viewedKeys, setViewedKeys] =
        useState([]);
    const [showViewed, setShowViewed] =
        useState(false);

    const mounted =
        useRef(true);
    const firstLoad =
        useRef(true);

    const can =
        useCallback(
            permission =>
                permissions.includes("*") ||
                permissions.includes(
                    permission
                ),
            [permissions]
        );

    const alerts =
        useMemo(
            () =>
                buildAlerts(
                    orders,
                    deliveries,
                    can
                ),
            [
                orders,
                deliveries,
                can
            ]
        );

    const visibleAlerts =
        useMemo(
            () =>
                showViewed
                    ? alerts
                    : alerts.filter(
                        alert =>
                            !viewedKeys.includes(
                                alert.id
                            )
                    ),
            [
                alerts,
                showViewed,
                viewedKeys
            ]
        );

    const unseenCount =
        alerts.filter(
            alert =>
                !viewedKeys.includes(
                    alert.id
                )
        ).length;

    const playSound =
        useCallback(() => {
            if (
                !soundEnabled ||
                typeof window ===
                    "undefined"
            ) {
                return;
            }

            try {
                const AudioContext =
                    window.AudioContext ||
                    window.webkitAudioContext;

                if (!AudioContext) {
                    return;
                }

                const context =
                    new AudioContext();
                const oscillator =
                    context.createOscillator();
                const gain =
                    context.createGain();

                oscillator.type =
                    "sine";
                oscillator.frequency
                    .setValueAtTime(
                        740,
                        context.currentTime
                    );
                oscillator.frequency
                    .setValueAtTime(
                        920,
                        context.currentTime +
                            0.12
                    );

                gain.gain
                    .setValueAtTime(
                        0.0001,
                        context.currentTime
                    );
                gain.gain
                    .exponentialRampToValueAtTime(
                        0.16,
                        context.currentTime +
                            0.02
                    );
                gain.gain
                    .exponentialRampToValueAtTime(
                        0.0001,
                        context.currentTime +
                            0.34
                    );

                oscillator.connect(gain);
                gain.connect(
                    context.destination
                );
                oscillator.start();
                oscillator.stop(
                    context.currentTime +
                        0.35
                );
                oscillator.addEventListener(
                    "ended",
                    () =>
                        context.close()
                );
            } catch {
                // El navegador puede bloquear audio sin interacción.
            }
        }, [soundEnabled]);

    const load =
        useCallback(
            async () => {
                try {
                    const requests = [];

                    if (
                        can(
                            "orders.view"
                        )
                    ) {
                        requests.push(
                            [
                                "orders",
                                fetch(
                                    `/api/resto/admin/orders/list?businessId=${encodeURIComponent(
                                        businessId
                                    )}&limit=500`,
                                    {
                                        cache:
                                            "no-store"
                                    }
                                )
                            ]
                        );
                    }

                    if (
                        can(
                            "delivery.view"
                        )
                    ) {
                        requests.push(
                            [
                                "delivery",
                                fetch(
                                    `/api/resto/admin/delivery?businessId=${encodeURIComponent(
                                        businessId
                                    )}`,
                                    {
                                        cache:
                                            "no-store"
                                    }
                                )
                            ]
                        );
                    }

                    const results =
                        await Promise.all(
                            requests.map(
                                async ([
                                    type,
                                    request
                                ]) => {
                                    const response =
                                        await request;

                                    const payload =
                                        await response
                                            .json()
                                            .catch(
                                                () => ({})
                                            );

                                    return {
                                        type,
                                        ok:
                                            response.ok,
                                        payload
                                    };
                                }
                            )
                        );

                    if (mounted.current) {
                        const orderResult =
                            results.find(
                                result =>
                                    result.type ===
                                    "orders" &&
                                    result.ok
                            );

                        const deliveryResult =
                            results.find(
                                result =>
                                    result.type ===
                                    "delivery" &&
                                    result.ok
                            );

                        setOrders(
                            Array.isArray(
                                orderResult
                                    ?.payload
                                    ?.orders
                            )
                                ? orderResult
                                    .payload
                                    .orders
                                : []
                        );

                        setDeliveries(
                            Array.isArray(
                                deliveryResult
                                    ?.payload
                                    ?.deliveries
                            )
                                ? deliveryResult
                                    .payload
                                    .deliveries
                                : []
                        );
                    }
                } finally {
                    if (mounted.current) {
                        setLoading(false);
                    }
                }
            },
            [
                businessId,
                can
            ]
        );

    useEffect(() => {
        mounted.current = true;

        const saved =
            window.localStorage.getItem(
                `tags-resto-alert-sound:${businessId}`
            );

        if (saved !== null) {
            setSoundEnabled(
                saved === "true"
            );
        }

        const savedViewed =
            window.localStorage.getItem(
                `tags-resto-alert-viewed:${businessId}`
            );

        if (savedViewed) {
            try {
                const parsed =
                    JSON.parse(
                        savedViewed
                    );

                setViewedKeys(
                    Array.isArray(parsed)
                        ? parsed
                        : []
                );
            } catch {
                setViewedKeys([]);
            }
        }

        load();

        const interval =
            window.setInterval(
                () => {
                    if (
                        document.visibilityState ===
                        "visible"
                    ) {
                        load();
                    }
                },
                12000
            );

        return () => {
            mounted.current = false;
            window.clearInterval(
                interval
            );
        };
    }, [businessId, load]);

    useEffect(() => {
        if (loading) {
            return;
        }

        const storageKey =
            `tags-resto-alert-keys:${businessId}`;
        const currentKeys =
            alerts.map(
                alert => alert.id
            );
        const previousKeys =
            JSON.parse(
                window.sessionStorage
                    .getItem(
                        storageKey
                    ) ||
                "[]"
            );

        if (
            !firstLoad.current &&
            currentKeys.some(
                key =>
                    !previousKeys.includes(
                        key
                    )
            )
        ) {
            playSound();
        }

        window.sessionStorage.setItem(
            storageKey,
            JSON.stringify(
                currentKeys
            )
        );

        firstLoad.current = false;
    }, [
        alerts,
        businessId,
        loading,
        playSound
    ]);

    function toggleSound() {
        const next =
            !soundEnabled;

        setSoundEnabled(next);
        window.localStorage.setItem(
            `tags-resto-alert-sound:${businessId}`,
            String(next)
        );

        if (next) {
            window.setTimeout(
                playSound,
                0
            );
        }
    }

    function saveViewed(next) {
        const activeKeys =
            new Set(
                alerts.map(
                    alert => alert.id
                )
            );

        const normalized =
            next
                .filter(
                    key =>
                        activeKeys.has(key)
                )
                .slice(-300);

        setViewedKeys(
            normalized
        );
        window.localStorage.setItem(
            `tags-resto-alert-viewed:${businessId}`,
            JSON.stringify(
                normalized
            )
        );
    }

    function markViewed(alert) {
        if (
            viewedKeys.includes(
                alert.id
            )
        ) {
            return;
        }

        saveViewed([
            ...viewedKeys,
            alert.id
        ]);
    }

    function markAllViewed() {
        saveViewed(
            Array.from(
                new Set([
                    ...viewedKeys,
                    ...alerts.map(
                        alert => alert.id
                    )
                ])
            )
        );
    }

    function openAlert(alert) {
        markViewed(alert);
        setOpen(false);
        router.push(
            `/dashboard/businesses/${businessId}/resto${alert.route}`
        );
    }

    return (
        <aside
            className={
                `tags_resto_alert_center ${open ? "is-open" : ""}`
            }
            aria-label="Alertas operativas"
        >
            {
                open && (
                    <section className="tags_resto_alert_panel">
                        <header>
                            <div>
                                <span>
                                    Operación en vivo
                                </span>
                                <h2>
                                    Alertas
                                </h2>
                            </div>

                            <div className="tags_resto_alert_panel_actions">
                                <button
                                    type="button"
                                    onClick={
                                        toggleSound
                                    }
                                    title={
                                        soundEnabled
                                            ? "Silenciar alertas"
                                            : "Activar sonido"
                                    }
                                >
                                    {
                                        soundEnabled
                                            ? <FaBell />
                                            : <FaBellSlash />
                                    }
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpen(false)
                                    }
                                    title="Cerrar alertas"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </header>

                        <div className="tags_resto_alert_list">
                            {
                                alerts.length > 0 && (
                                    <div className="tags_resto_alert_tools">
                                        <button
                                            type="button"
                                            onClick={markAllViewed}
                                            disabled={unseenCount === 0}
                                        >
                                            <FaCheckDouble />
                                            Marcar todas como vistas
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowViewed(
                                                    current =>
                                                        !current
                                                )
                                            }
                                        >
                                            <FaEye />
                                            {
                                                showViewed
                                                    ? "Ocultar vistas"
                                                    : "Mostrar vistas"
                                            }
                                        </button>
                                    </div>
                                )
                            }

                            {
                                loading ? (
                                    <p className="tags_resto_alert_empty">
                                        Actualizando alertas…
                                    </p>
                                ) : visibleAlerts.length ? (
                                    visibleAlerts.map(alert => {
                                        const Icon =
                                            alert.Icon;
                                        const viewed =
                                            viewedKeys.includes(
                                                alert.id
                                            );

                                        return (
                                            <button
                                                type="button"
                                                key={alert.id}
                                                className={
                                                    `tags_resto_alert_item is-${alert.type} ${viewed ? "is-viewed" : ""}`
                                                }
                                                onClick={() =>
                                                    openAlert(
                                                        alert
                                                    )
                                                }
                                            >
                                                <span className="tags_resto_alert_item_icon">
                                                    <Icon />
                                                </span>

                                                <span className="tags_resto_alert_item_content">
                                                    <strong>
                                                        {alert.title}
                                                    </strong>
                                                    <small>
                                                        {alert.detail}
                                                    </small>
                                                    {
                                                        alert.meta && (
                                                            <em>
                                                                {alert.meta}
                                                            </em>
                                                        )
                                                    }
                                                    <em className="tags_resto_alert_view_state">
                                                        {
                                                            viewed
                                                                ? "Visualizada"
                                                                : "Abrir y marcar como visualizada"
                                                        }
                                                    </em>
                                                </span>

                                                <FaChevronRight />
                                            </button>
                                        );
                                    })
                                ) : alerts.length ? (
                                    <div className="tags_resto_alert_empty is-clear">
                                        <FaCheckDouble />
                                        <strong>
                                            Alertas visualizadas
                                        </strong>
                                        <span>
                                            PodÃ©s mostrarlas nuevamente o esperar novedades.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="tags_resto_alert_empty is-clear">
                                        <FaClipboardCheck />
                                        <strong>
                                            Todo al día
                                        </strong>
                                        <span>
                                            No hay alertas pendientes.
                                        </span>
                                    </div>
                                )
                            }
                        </div>
                    </section>
                )
            }

            <button
                type="button"
                className="tags_resto_alert_trigger"
                onClick={() =>
                    setOpen(current =>
                        !current
                    )
                }
                aria-expanded={open}
                title="Alertas operativas"
            >
                <FaBell />
                {
                    unseenCount > 0 && (
                        <span>
                            {
                                unseenCount > 99
                                    ? "99+"
                                    : unseenCount
                            }
                        </span>
                    )
                }
            </button>
        </aside>
    );
}
