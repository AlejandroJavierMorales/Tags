// =====================================
// FILE: /app/modules/resto/lib/orders/restoOrderFilters.js
// Descripción:
// Funciones de filtrado para pedidos de Tags Resto.
// No modifica los datos originales.
// =====================================

import {
    getRestoOrderServiceMode,
    hasRestoBillRequest,
    hasRestoStaffRequest
} from "./restoOrderMetadata";

function normalize(value) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase();

}

function contains(text, search) {

    return normalize(text)
        .includes(
            normalize(search)
        );

}

export function filterRestoOrders(
    orders = [],
    filters = {}
) {

    if (
        !Array.isArray(
            orders
        )
    ) {

        return [];

    }

    const {

        q = "",

        orderStatus = "",

        paymentStatus = "",

        serviceMode = "",

        billRequested = false,

        staffRequested = false

    } = filters;

    const query =
        normalize(q);

    return orders.filter(
        (
            order
        ) => {

            if (
                query
            ) {

                const searchable = [

                    order.order_number,

                    order.customer_name,

                    order.customer_email,

                    order.customer_phone,

                    order.location_name,

                    order.table_name,

                    order.notes

                ];

                const found =
                    searchable.some(
                        (
                            value
                        ) =>
                            contains(
                                value,
                                query
                            )
                    );

                if (
                    !found
                ) {

                    return false;

                }

            }

            if (
                orderStatus &&
                order.order_status !==
                    orderStatus
            ) {

                return false;

            }

            if (
                paymentStatus &&
                order.payment_status !==
                    paymentStatus
            ) {

                return false;

            }

            if (
                serviceMode
            ) {

                if (
                    getRestoOrderServiceMode(
                        order
                    ) !==
                    serviceMode
                ) {

                    return false;

                }

            }

            if (
                billRequested &&
                !hasRestoBillRequest(
                    order
                )
            ) {

                return false;

            }

            if (
                staffRequested &&
                !hasRestoStaffRequest(
                    order
                )
            ) {

                return false;

            }

            return true;

        }
    );

}

export function getAvailableRestoServiceModes() {

    return [

        {
            value:
                "table",
            label:
                "Mesa"
        },

        {
            value:
                "takeaway",
            label:
                "Para llevar"
        },

        {
            value:
                "delivery",
            label:
                "Delivery"
        }

    ];

}

export function getAvailableRestoOrderStatuses() {

    return [

        {
            value:
                "new",
            label:
                "Pendiente de enviar"
        },

        {
            value:
                "preparing",
            label:
                "En cocina"
        },

        {
            value:
                "ready",
            label:
                "Listo"
        },

        {
            value:
                "served",
            label:
                "Entregado"
        }

    ];

}

export function getAvailableRestoPaymentStatuses() {

    return [

        {
            value:
                "pending",
            label:
                "Pendiente"
        },

        {
            value:
                "paid",
            label:
                "Pagado"
        },

        {
            value:
                "cancelled",
            label:
                "Cancelado"
        },

        {
            value:
                "refunded",
            label:
                "Reintegrado"
        }

    ];

}
