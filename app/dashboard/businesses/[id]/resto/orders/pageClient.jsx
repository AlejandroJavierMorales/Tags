// =====================================
// FILE: /app/dashboard/businesses/[id]/resto/orders/pageClient.jsx
// Descripción:
// Controlador principal del módulo de pedidos de Tags Resto.
// Carga los pedidos, administra filtros y actualiza
// estados operativos y de pago.
// =====================================

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

import showAlert
    from "@/app/components/showAlert";

import TagsSpinner
    from "@/app/components/TagsSpinner";

import RestoOrdersHeader
    from "@/app/modules/resto/components/admin/orders/RestoOrdersHeader";

import RestoOrdersStats
    from "@/app/modules/resto/components/admin/orders/RestoOrdersStats";

import RestoOrdersFilters
    from "@/app/modules/resto/components/admin/orders/RestoOrdersFilters";

import RestoOrdersGrid
    from "@/app/modules/resto/components/admin/orders/RestoOrdersGrid";

import {
    filterRestoOrders,
    getRestoOrdersStats,
    sortRestoOrders
} from "@/app/modules/resto/lib/orders";

import {
    requestRestoPayment
} from "@/app/modules/resto/lib/cash/requestRestoPayment";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/modules/resto/styles/orders/index.css";

export default function RestoOrdersPageClient({
    businessId,
    session,
    isAdmin,
    permissions = ["*"]
}) {

    const router =
        useRouter();

    const can =
        permission =>
            permissions.includes("*") ||
            permissions.includes(
                permission
            );

    const capabilities = {
        view: can("orders.view"),
        edit: can("orders.items"),
        confirm: can("tables.open"),
        sendToKitchen:
            can("orders.items"),
        deliver:
            can("orders.deliver"),
        charge:
            can("orders.payment"),
        close:
            can("tables.close")
    };

    const [loading, setLoading] =
        useState(
            true
        );

    const [refreshing, setRefreshing] =
        useState(
            false
        );

    const [
        updatingOrderId,
        setUpdatingOrderId
    ] =
        useState(
            null
        );

    const [orders, setOrders] =
        useState(
            []
        );

    const [store, setStore] =
        useState(
            null
        );

    const [query, setQuery] =
        useState(
            ""
        );

    const [
        statusFilter,
        setStatusFilter
    ] =
        useState(
            ""
        );

    const [
        paymentFilter,
        setPaymentFilter
    ] =
        useState(
            ""
        );

    const loadOrders =
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

                    const params =
                        new URLSearchParams({
                            businessId:
                                String(
                                    businessId
                                ),

                            limit:
                                "100"
                        });

                    const response =
                        await fetch(
                            `/api/resto/admin/orders/list?${params.toString()}`,
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
                            "No se pudieron cargar los pedidos."
                        );

                    }

                    setOrders(
                        Array.isArray(
                            data?.orders
                        )
                            ? data.orders
                            : []
                    );

                    setStore(
                        data?.store ||
                        (
                            data?.storeId
                                ? {
                                    id:
                                        data.storeId
                                }
                                : null
                        )
                    );

                } catch (err) {

                    console.error(
                        "RESTO ORDERS LOAD ERROR:",
                        err
                    );

                    showAlert({
                        icon:
                            "error",

                        title:
                            "Pedidos",

                        text:
                            err.message ||
                            "No se pudieron cargar los pedidos."
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

            loadOrders();

        },
        [
            loadOrders
        ]
    );

    useEffect(
        () => {

            const timer =
                window.setInterval(
                    () => {

                        loadOrders({
                            silent: true
                        });

                    },
                    10000
                );

            return () =>
                window.clearInterval(
                    timer
                );

        },
        [
            loadOrders
        ]
    );

    async function confirmPendingOrder(
        order
    ) {

        setUpdatingOrderId(
            order.id
        );

        try {

            const action =
                order.session_status ===
                    "pending_activation"
                    ? "activate_session"
                    : "confirm_order";

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
                                orderId:
                                    order.id,
                                action
                            })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "No se pudo confirmar el pedido."
                );

            }

            await loadOrders({
                silent: true
            });

            showAlert({
                icon: "success",
                title:
                    "Pedido confirmado",
                text:
                    "El cliente ya puede continuar con su pedido.",
                timer: 1400,
                showConfirmButton:
                    false
            });

        } catch (err) {

            showAlert({
                icon: "error",
                title:
                    "Confirmar pedido",
                text:
                    err.message
            });

        } finally {

            setUpdatingOrderId(
                null
            );

        }

    }

    const operationalOrders =
        useMemo(
            () =>
                orders.filter(
                    order =>
                        ![
                            "closed",
                            "cancelled"
                        ].includes(
                            order.session_status
                        )
                ),
            [
                orders
            ]
        );

    const visibleOrders =
        useMemo(
            () => {

                const filteredOrders =
                    filterRestoOrders(
                        operationalOrders,
                        {
                            q:
                                query,

                            orderStatus:
                                statusFilter,

                            paymentStatus:
                                paymentFilter
                        }
                    );

                return sortRestoOrders(
                    filteredOrders,
                    "oldest"
                );

            },
            [
                operationalOrders,
                query,
                statusFilter,
                paymentFilter
            ]
        );

    const stats =
    useMemo(
        () =>
            getRestoOrdersStats(
                operationalOrders
            ),
        [
            operationalOrders
        ]
    );

    function clearFilters() {

        setQuery(
            ""
        );

        setStatusFilter(
            ""
        );

        setPaymentFilter(
            ""
        );

    }

    function updateOrderLocally(
        orderId,
        changes
    ) {

        setOrders(
            currentOrders =>
                currentOrders.map(
                    order => {

                        if (
                            Number(
                                order.id
                            ) !==
                            Number(
                                orderId
                            )
                        ) {

                            return order;

                        }

                        return {
                            ...order,
                            ...changes,
                            updated_at:
                                new Date()
                                    .toISOString()
                        };

                    }
                )
        );

    }

    async function updateOrderStatus(
        order,
        orderStatus
    ) {

        if (
            !order?.id ||
            !orderStatus
        ) {

            return;

        }

        setUpdatingOrderId(
            order.id
        );

        try {

            if (
                orderStatus ===
                "shipped"
            ) {

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
                                    action:
                                        "serve_ready"
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
                        "No se pudo entregar el pedido."
                    );

                }

                await loadOrders({
                    silent:
                        true
                });

                showAlert({
                    icon:
                        "success",

                    title:
                        "Pedido entregado",

                    text:
                        "Los productos listos fueron marcados como entregados.",

                    timer:
                        1300
                });

                return;

            }

            if (
                orderStatus ===
                "completed"
            ) {

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
                                    action:
                                        "close_session"
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
                        "No se pudo cerrar la sesión."
                    );

                }

                await loadOrders({
                    silent: true
                });

                showAlert({
                    icon:
                        "success",
                    title:
                        "Sesión cerrada",
                    text:
                        "El pedido pasó al historial.",
                    timer:
                        1300
                });

                return;

            }

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
                                    orderStatus
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
                    "No se pudo actualizar el pedido."
                );

            }

            updateOrderLocally(
                order.id,
                {
                    order_status:
                        orderStatus,

                    session_status:
                        data?.status ||
                        order.session_status
                }
            );

            showAlert({
                icon:
                    "success",

                title:
                    "Pedido actualizado",

                text:
                    "El estado del pedido fue actualizado.",

                timer:
                    1300,

                showConfirmButton:
                    false
            });

        } catch (err) {

            console.error(
                "RESTO ORDER STATUS ERROR:",
                err
            );

            showAlert({
                icon:
                    "error",

                title:
                    "Pedido",

                text:
                    err.message ||
                    "No se pudo actualizar el pedido."
            });

        } finally {

            setUpdatingOrderId(
                null
            );

        }

    }

    async function sendPendingItemsToKitchen(
        order
    ) {

        if (!order?.id) {
            return;
        }

        setUpdatingOrderId(
            order.id
        );

        try {

            const response =
                await fetch(
                    "/api/resto/admin/orders/send-to-kitchen",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({

                            businessId,

                            orderId:
                                order.id

                        })
                    }
                );

            const data =
                await response
                    .json()
                    .catch(() => null);

            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    "No se pudieron enviar los productos."
                );

            }

            await loadOrders({
                silent: true
            });

            showAlert({

                icon: "success",

                title: "Cocina",

                text:
                    `${data.sent_units} producto(s) enviados a cocina.`,

                timer: 1400,

                showConfirmButton: false

            });

        }

        catch (err) {

            console.error(
                "SEND TO KITCHEN ERROR:",
                err
            );

            showAlert({

                icon: "error",

                title: "Cocina",

                text:
                    err.message ||
                    "No se pudieron enviar los productos."

            });

        }

        finally {

            setUpdatingOrderId(
                null
            );

        }

    }

    async function markOrderAsPaid(
        order
    ) {

        if (
            !order?.id ||
            order.payment_status ===
            "paid"
        ) {

            return;

        }

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

        setUpdatingOrderId(
            order.id
        );

        try {

            const response =
                await fetch(
                    "/api/resto/admin/orders/payment",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({

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

            updateOrderLocally(
                order.id,
                {
                    payment_status:
                        data.payment_status,

                    paid_total:
                        data.paid_total,

                    pending_amount:
                        data.pending_amount,

                    paid_at:
                        data.paid_at
                }
            );

            showAlert({
                icon:
                    "success",

                title:
                    "Cobro registrado",

                text:
                    "El pedido fue marcado como pagado.",

                timer:
                    1300,

                showConfirmButton:
                    false
            });

        } catch (err) {

            console.error(
                "RESTO ORDER PAYMENT ERROR:",
                err
            );

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

    function openOrder(
        order
    ) {

        router.push(
            `/dashboard/businesses/${businessId}/resto/orders/${order.id}`
        );

    }

    function editOrder(
        order
    ) {

        router.push(
            `/dashboard/businesses/${businessId}/resto/orders/${order.id}?edit=1`
        );

    }

    function goBack() {

        router.push(
            `/dashboard/businesses/${businessId}/resto`
        );

    }

    if (loading) {

        return (
            <div className="tags_resto_orders_loading">
                <TagsSpinner />
            </div>
        );

    }


    /*  UI  */
    return (
        <main className="tags_resto_orders_page px-2 mb-5 pb-5">

            <RestoOrdersHeader
                store={store}
                session={session}
                isAdmin={isAdmin}
                refreshing={refreshing}
                onBack={goBack}
                onTables={
                    can("tables.view")
                        ? () =>
                        router.push(
                            `/dashboard/businesses/${businessId}/resto/tables`
                        )
                        : null
                }
                onHistory={
                    can("history.view")
                        ? () =>
                        router.push(
                            `/dashboard/businesses/${businessId}/resto/orders/history`
                        )
                        : null
                }
                onKitchen={
                    can("kitchen.view")
                        ? () =>
                        router.push(
                            `/dashboard/businesses/${businessId}/resto/kitchen`
                        )
                        : null
                }
                onWaiter={
                    can("waiter.view")
                        ? () =>
                        router.push(
                            `/dashboard/businesses/${businessId}/resto/waiter`
                        )
                        : null
                }
                onRefresh={
                    () =>
                        loadOrders({
                            silent:
                                true
                        })
                }
            />

            <RestoOrdersStats
                stats={stats}
                onKitchen={
                    () =>
                        router.push(
                            `/dashboard/businesses/${businessId}/resto/kitchen`
                        )
                }
            />

            <RestoOrdersFilters
                query={query}
                statusFilter={statusFilter}
                paymentFilter={paymentFilter}
                totalVisible={
                    visibleOrders.length
                }
                hasActiveFilters={
                    Boolean(
                        query ||
                        statusFilter ||
                        paymentFilter
                    )
                }
                onQueryChange={
                    setQuery
                }
                onStatusChange={
                    setStatusFilter
                }
                onPaymentChange={
                    setPaymentFilter
                }
                onClear={clearFilters}
            />

            <RestoOrdersGrid
                orders={visibleOrders}
                store={store}
                updatingOrderId={
                    updatingOrderId
                }
                onOpenOrder={openOrder}
                onEditOrder={editOrder}
                onUpdateStatus={
                    updateOrderStatus
                }
                onSendToKitchen={sendPendingItemsToKitchen}
                onMarkAsPaid={
                    markOrderAsPaid
                }
                onConfirmSession={
                    confirmPendingOrder
                }
                capabilities={
                    capabilities
                }
            />

        </main>
    );

}
