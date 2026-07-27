// =====================================
// FILE: /app/api/resto/admin/orders/list/route.js
// Descripción:
// Lista las sesiones y pedidos operativos de Tags Resto.
// La carga y normalización se comparte con el detalle.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    getRestoOrdersStats
} from "@/app/modules/resto/lib/orders";

import {
    getNormalizedOrders
} from "@/app/modules/resto/lib/orders/getNormalizedOrders";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

function clean(value) {

    return String(
        value || ""
    ).trim();

}

function normalize(value) {

    return clean(
        value
    ).toLowerCase();

}

function matchesQuery(
    order,
    query
) {

    if (!query) {

        return true;

    }

    const searchableValues = [
        order.order_number,
        order.session_token,
        order.customer_name,
        order.customer_email,
        order.customer_phone,
        order.location_name,
        order.parent_location_name,
        order.table_name,
        order.products_text,
        order.notes
    ];

    return searchableValues.some(
        value =>
            normalize(
                value
            ).includes(
                query
            )
    );

}

function matchesFilters(
    order,
    filters
) {

    const {
        query,
        status,
        payment,
        serviceMode,
        billRequested,
        staffRequested
    } = filters;

    if (
        !matchesQuery(
            order,
            query
        )
    ) {

        return false;

    }

    if (
        status &&
        order.order_status !==
        status
    ) {

        return false;

    }

    if (
        payment &&
        order.payment_status !==
        payment
    ) {

        return false;

    }

    if (
        serviceMode &&
        order.service_mode !==
        serviceMode
    ) {

        return false;

    }

    if (
        billRequested &&
        !order.bill_requested
    ) {

        return false;

    }

    if (
        staffRequested &&
        !order.staff_requested
    ) {

        return false;

    }

    return true;

}

function buildStats(
    orders
) {

    const restoStats =
        getRestoOrdersStats(
            orders
        );

    return {
        ...restoStats,

        total_orders:
            restoStats.total,

        active_orders:
            restoStats.active,

        new_orders:
            restoStats.new,

        confirmed_orders:
            restoStats.confirmed,

        preparing_orders:
            restoStats.preparing,

        ready_orders:
            restoStats.ready,

        shipped_orders:
            restoStats.shipped,

        completed_orders:
            restoStats.completed,

        cancelled_orders:
            restoStats.cancelled,

        pending_payments:
            restoStats.paymentPending,

        paid_orders:
            restoStats.paymentPaid,

        bill_requests:
            restoStats.billRequested,

        staff_requests:
            restoStats.staffRequested,

        total_revenue:
            restoStats.totalAmount,

        average_ticket:
            restoStats.averageTicket
    };

}

export async function GET(
    req
) {

    try {

        const {
            searchParams
        } =
            new URL(
                req.url
            );

        const businessId =
            clean(
                searchParams.get(
                    "businessId"
                )
            );

        const query =
            normalize(
                searchParams.get(
                    "q"
                )
            );

        const status =
            normalize(
                searchParams.get(
                    "status"
                )
            );

        const payment =
            normalize(
                searchParams.get(
                    "payment"
                )
            );

        const serviceMode =
            normalize(
                searchParams.get(
                    "serviceMode"
                )
            );

        const billRequested =
            searchParams.get(
                "billRequested"
            ) ===
            "true";

        const staffRequested =
            searchParams.get(
                "staffRequested"
            ) ===
            "true";

        const page =
            Math.max(
                1,
                Number(
                    searchParams.get(
                        "page"
                    ) ||
                    1
                )
            );

        const limit =
            Math.min(
                500,
                Math.max(
                    10,
                    Number(
                        searchParams.get(
                            "limit"
                        ) ||
                        20
                    )
                )
            );

        if (!businessId) {

            return Response.json(
                {
                    error:
                        "businessId es requerido"
                },
                {
                    status:
                        400
                }
            );

        }

        const access =
            await getRestoAccess({
                businessId,
                permission:
                    "orders.view"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        const {
            store,
            orders:
                normalizedOrders
        } =
            await getNormalizedOrders({
                businessId
            });

        if (!store) {

            return Response.json(
                {
                    error:
                        "Tags Resto no encontrado"
                },
                {
                    status:
                        404
                }
            );

        }

        const filteredOrders =
            normalizedOrders.filter(
                order =>
                    matchesFilters(
                        order,
                        {
                            query,
                            status,
                            payment,
                            serviceMode,
                            billRequested,
                            staffRequested
                        }
                    )
            );

        const total =
            filteredOrders.length;

        const totalPages =
            total > 0
                ? Math.ceil(
                    total /
                    limit
                )
                : 0;

        const offset =
            (
                page -
                1
            ) *
            limit;

        const orders =
            filteredOrders.slice(
                offset,
                offset +
                limit
            );

        return Response.json({
            ok:
                true,

            storeId:
                store.id,

            store,

            orders,

            stats:
                buildStats(
                    filteredOrders
                ),

            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });

    } catch (err) {

        console.error(
            "RESTO ADMIN ORDERS LIST ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error listando pedidos de Tags Resto"
            },
            {
                status:
                    500
            }
        );

    }

}
