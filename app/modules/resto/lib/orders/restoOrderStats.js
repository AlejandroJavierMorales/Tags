// =====================================
// FILE: /app/modules/resto/lib/orders/restoOrderStats.js
// Descripción:
// Cálculo de KPIs y estadísticas operativas
// para el módulo de Pedidos de Tags Resto.
// Distingue pedidos de productos en preparación.
// =====================================

import {
    hasRestoBillRequest,
    hasRestoStaffRequest
} from "./restoOrderMetadata";

function safeNumber(
    value
) {

    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : 0;

}

function safeArray(
    value
) {

    return Array.isArray(
        value
    )
        ? value
        : [];

}

function getKitchenStats(
    order
) {

    const kitchen =
        order?.kitchen || {};

    return {

        total:
            safeNumber(
                kitchen.total
            ),

        pending:
            safeNumber(
                kitchen.pending
            ),

        sent:
            safeNumber(
                kitchen.sent
            ),

        ready:
            safeNumber(
                kitchen.ready
            ),

        served:
            safeNumber(
                kitchen.served
            ),

        cancelled:
            safeNumber(
                kitchen.cancelled
            )

    };

}

export function getRestoOrdersStats(
    orders = []
) {

    const rows =
        safeArray(
            orders
        );

    const stats = {

        total:
            rows.length,

        active: 0,

        new: 0,

        confirmed: 0,

        preparing: 0,

        ready: 0,

        served: 0,

        shipped: 0,

        completed: 0,

        cancelled: 0,

        billRequested: 0,

        staffRequested: 0,

        paymentPending: 0,

        paymentPartial: 0,

        paymentPaid: 0,

        paymentCancelled: 0,

        paymentRefunded: 0,

        totalAmount: 0,

        averageTicket: 0,

        kitchenTotalItems: 0,

        kitchenPendingItems: 0,

        kitchenSentItems: 0,

        kitchenReadyItems: 0,

        kitchenServedItems: 0,

        kitchenCancelledItems: 0,

        kitchenPendingOrders: 0,

        kitchenPreparingOrders: 0,

        kitchenReadyOrders: 0,

        kitchenServedOrders: 0

    };

    for (
        const order
        of rows
    ) {

        const kitchen =
            getKitchenStats(
                order
            );

        stats.totalAmount +=
            safeNumber(
                order.total
            );

        stats.kitchenTotalItems +=
            kitchen.total;

        stats.kitchenPendingItems +=
            kitchen.pending;

        stats.kitchenSentItems +=
            kitchen.sent;

        stats.kitchenReadyItems +=
            kitchen.ready;

        stats.kitchenServedItems +=
            kitchen.served;

        stats.kitchenCancelledItems +=
            kitchen.cancelled;

        if (
            kitchen.pending > 0
        ) {

            stats.kitchenPendingOrders++;

        }

        if (
            kitchen.sent > 0
        ) {

            stats.kitchenPreparingOrders++;

        }

        if (
            order.order_status ===
            "ready"
        ) {

            stats.kitchenReadyOrders++;

        }

        if (
            order.order_status ===
            "served"
        ) {

            stats.kitchenServedOrders++;

        }

        switch (
            order.order_status
        ) {

            case "new":

                stats.new++;
                stats.active++;
                break;

            case "confirmed":

                stats.confirmed++;
                stats.active++;
                break;

            case "preparing":

                stats.preparing++;
                stats.active++;
                break;

            case "ready":

                stats.ready++;
                stats.active++;
                break;

            case "served":

                stats.served++;
                stats.active++;
                break;

            case "shipped":

                stats.shipped++;
                break;

            case "completed":

                stats.completed++;
                break;

            case "cancelled":

                stats.cancelled++;
                break;

            default:

                break;

        }

        switch (
            order.payment_status
        ) {

            case "pending":

                stats.paymentPending++;
                break;

            case "partial":

                stats.paymentPartial++;
                break;

            case "paid":

                stats.paymentPaid++;
                break;

            case "cancelled":

                stats.paymentCancelled++;
                break;

            case "refunded":

                stats.paymentRefunded++;
                break;

            default:

                break;

        }

        if (
            hasRestoBillRequest(
                order
            )
        ) {

            stats.billRequested++;

        }

        if (
            hasRestoStaffRequest(
                order
            )
        ) {

            stats.staffRequested++;

        }

    }

    stats.averageTicket =
        stats.total
            ? (
                stats.totalAmount /
                stats.total
            )
            : 0;

    return stats;

}

export function getEmptyRestoOrderStats() {

    return getRestoOrdersStats(
        []
    );

}

export function getRestoOrdersResume(
    orders = []
) {

    const stats =
        getRestoOrdersStats(
            orders
        );

    return [

        {
            key:
                "active",
            value:
                stats.active
        },

        {
            key:
                "preparing",
            value:
                stats.preparing,
            secondaryValue:
                stats.kitchenSentItems
        },

        {
            key:
                "ready",
            value:
                stats.ready,
            secondaryValue:
                stats.kitchenReadyItems
        },

        {
            key:
                "billRequested",
            value:
                stats.billRequested
        },

        {
            key:
                "staffRequested",
            value:
                stats.staffRequested
        },

        {
            key:
                "paymentPending",
            value:
                stats.paymentPending
        }

    ];

}