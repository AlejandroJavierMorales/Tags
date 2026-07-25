// =====================================
// FILE: /app/modules/resto/lib/orders/restoOrderSorting.js
// Descripción:
// Funciones de ordenamiento para pedidos de Tags Resto.
// Implementa el orden operativo por defecto y otros
// criterios reutilizables.
// =====================================

import {
    hasRestoBillRequest,
    hasRestoStaffRequest
} from "./restoOrderMetadata";

const operationalPriority = {

    cancelled: 90,

    completed: 80,

    shipped: 70,

    confirmed: 60,

    new: 50,

    ready: 40,

    preparing: 30

};

function getOperationalPriority(
    order
) {

    if (!order) {

        return 999;

    }

    if (
        hasRestoStaffRequest(
            order
        )
    ) {

        return 10;

    }

    if (
        hasRestoBillRequest(
            order
        )
    ) {

        return 20;

    }

    return (
        operationalPriority[
            order.order_status
        ] ?? 100
    );

}

function getCreatedTimestamp(
    order
) {

    if (
        !order?.created_at
    ) {

        return 0;

    }

    const timestamp =
        new Date(
            order.created_at
        ).getTime();

    return Number.isFinite(
        timestamp
    )
        ? timestamp
        : 0;

}

function compareOperational(
    a,
    b
) {

    const priorityA =
        getOperationalPriority(
            a
        );

    const priorityB =
        getOperationalPriority(
            b
        );

    if (
        priorityA !==
        priorityB
    ) {

        return (
            priorityA -
            priorityB
        );

    }

    const createdA =
        getCreatedTimestamp(
            a
        );

    const createdB =
        getCreatedTimestamp(
            b
        );

    if (
        createdA !==
        createdB
    ) {

        return (
            createdA -
            createdB
        );

    }

    return (
        Number(
            a?.id || 0
        ) -
        Number(
            b?.id || 0
        )
    );

}

const comparators = {

    operational:
        compareOperational,

    newest(
        a,
        b
    ) {

        return (
            getCreatedTimestamp(
                b
            ) -
            getCreatedTimestamp(
                a
            )
        );

    },

    oldest(
        a,
        b
    ) {

        return (
            getCreatedTimestamp(
                a
            ) -
            getCreatedTimestamp(
                b
            )
        );

    },

    totalAsc(
        a,
        b
    ) {

        return (
            Number(
                a?.total || 0
            ) -
            Number(
                b?.total || 0
            )
        );

    },

    totalDesc(
        a,
        b
    ) {

        return (
            Number(
                b?.total || 0
            ) -
            Number(
                a?.total || 0
            )
        );

    },

    number(
        a,
        b
    ) {

        return String(
            a?.order_number ||
            ""
        ).localeCompare(
            String(
                b?.order_number ||
                ""
            ),
            "es"
        );

    },

    location(
        a,
        b
    ) {

        return String(
            a?.location_name ||
            a?.table_name ||
            ""
        ).localeCompare(
            String(
                b?.location_name ||
                b?.table_name ||
                ""
            ),
            "es"
        );

    }

};

export function sortRestoOrders(
    orders = [],
    mode = "operational"
) {

    if (
        !Array.isArray(
            orders
        )
    ) {

        return [];

    }

    const comparator =
        comparators[
            mode
        ] ||
        comparators.operational;

    return [
        ...orders
    ].sort(
        comparator
    );

}

export function getRestoOrderOperationalPriority(
    order
) {

    return getOperationalPriority(
        order
    );

}

export function getAvailableRestoOrderSortingModes() {

    return [
        {
            value:
                "operational",
            label:
                "Operativo"
        },
        {
            value:
                "newest",
            label:
                "Más recientes"
        },
        {
            value:
                "oldest",
            label:
                "Más antiguos"
        },
        {
            value:
                "totalDesc",
            label:
                "Mayor importe"
        },
        {
            value:
                "totalAsc",
            label:
                "Menor importe"
        },
        {
            value:
                "location",
            label:
                "Ubicación"
        },
        {
            value:
                "number",
            label:
                "Número de pedido"
        }
    ];

}