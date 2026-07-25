// =====================================
// FILE: /app/modules/resto/lib/orders/restoOrderMetadata.js
// Descripción:
// Utilidades para leer de forma segura metadata_json
// y obtener información operativa de pedidos de Tags Resto.
// =====================================

export function parseRestoOrderMetadata(
    value
) {

    if (!value) {

        return {};

    }

    if (
        typeof value ===
        "object" &&
        !Array.isArray(
            value
        )
    ) {

        return value;

    }

    if (
        typeof value !==
        "string"
    ) {

        return {};

    }

    try {

        const parsedValue =
            JSON.parse(
                value
            );

        if (
            parsedValue &&
            typeof parsedValue ===
                "object" &&
            !Array.isArray(
                parsedValue
            )
        ) {

            return parsedValue;

        }

        return {};

    } catch {

        return {};

    }

}

export function getRestoOrderSessionId(
    order
) {

    if (!order) {

        return null;

    }

    return (
        order.resto_session_id ||
        null
    );

}

export function getRestoOrderLocationName(
    order
) {

    if (!order) {

        return null;

    }

    const metadata =
        parseRestoOrderMetadata(
            order.metadata_json
        );

    const locationName =
        order.location_name ||
        order.table_name ||
        order.resto_location_name ||
        metadata.location_name ||
        metadata.table_name ||
        metadata.resto_location_name ||
        metadata.location?.name ||
        metadata.table?.name ||
        null;

    const parentLocationName =
        order.parent_location_name ||
        metadata.parent_location_name ||
        metadata.location?.parent_name ||
        null;

    if (
        parentLocationName &&
        locationName
    ) {

        return `${parentLocationName} · ${locationName}`;

    }

    return (
        locationName ||
        parentLocationName ||
        null
    );

}

export function getRestoOrderLocationId(
    order
) {

    if (!order) {

        return null;

    }

    const metadata =
        parseRestoOrderMetadata(
            order.metadata_json
        );

    return (
        order.location_id ||
        order.table_id ||
        order.resto_location_id ||
        metadata.location_id ||
        metadata.table_id ||
        metadata.resto_location_id ||
        metadata.location?.id ||
        metadata.table?.id ||
        null
    );

}

export function getRestoOrderServiceMode(
    order
) {

    if (!order) {

        return null;

    }

    const metadata =
        parseRestoOrderMetadata(
            order.metadata_json
        );

    return (
        order.service_mode ||
        metadata.service_mode ||
        metadata.order_mode ||
        metadata.mode ||
        null
    );

}

export function getRestoOrderServiceModeLabel(
    order
) {

    const serviceMode =
        getRestoOrderServiceMode(
            order
        );

    if (
        serviceMode ===
        "table"
    ) {

        return "Consumo en el lugar";

    }

    if (
        serviceMode ===
        "delivery"
    ) {

        return "Envío a domicilio";

    }

    if (
        serviceMode ===
        "pickup"
    ) {

        return "Retiro en el local";

    }

    if (
        serviceMode ===
        "takeaway"
    ) {

        return "Para llevar";

    }

    return (
        order?.shipping_method_name ||
        "Pedido gastronómico"
    );

}

export function getRestoOrderItemsCount(
    order
) {

    if (!order) {

        return 0;

    }

    const possibleValues = [
        order.items_count,
        order.total_items,
        order.item_count,
        order.products_count
    ];

    for (
        const value
        of possibleValues
    ) {

        if (
            value !==
            undefined &&
            value !==
            null &&
            value !==
            ""
        ) {

            return (
                Number(
                    value
                ) ||
                0
            );

        }

    }

    if (
        Array.isArray(
            order.items
        )
    ) {

        return order.items.reduce(
            (
                total,
                item
            ) => {

                return (
                    total +
                    (
                        Number(
                            item?.quantity
                        ) ||
                        0
                    )
                );

            },
            0
        );

    }

    return 0;

}

export function hasRestoBillRequest(
    order
) {

    if (!order) {

        return false;

    }

    const metadata =
        parseRestoOrderMetadata(
            order.metadata_json
        );

    return Boolean(
        order.bill_requested_at ||
        order.bill_requested ||
        metadata.bill_requested_at ||
        metadata.bill_requested ||
        metadata.requests?.bill?.requested_at ||
        metadata.requests?.bill?.status ===
            "pending"
    );

}

export function getRestoBillRequestTime(
    order
) {

    if (!order) {

        return null;

    }

    const metadata =
        parseRestoOrderMetadata(
            order.metadata_json
        );

    return (
        order.bill_requested_at ||
        metadata.bill_requested_at ||
        metadata.requests?.bill?.requested_at ||
        null
    );

}

export function getRestoBillRequestStatus(
    order
) {

    if (!order) {

        return null;

    }

    const metadata =
        parseRestoOrderMetadata(
            order.metadata_json
        );

    return (
        order.bill_request_status ||
        metadata.bill_request_status ||
        metadata.requests?.bill?.status ||
        (
            hasRestoBillRequest(
                order
            )
                ? "pending"
                : null
        )
    );

}

export function hasRestoStaffRequest(
    order
) {

    if (!order) {

        return false;

    }

    const metadata =
        parseRestoOrderMetadata(
            order.metadata_json
        );

    return Boolean(
        order.staff_requested_at ||
        order.staff_requested ||
        order.assistance_requested_at ||
        metadata.staff_requested_at ||
        metadata.staff_requested ||
        metadata.assistance_requested_at ||
        metadata.requests?.staff?.requested_at ||
        metadata.requests?.staff?.status ===
            "pending"
    );

}

export function getRestoStaffRequestTime(
    order
) {

    if (!order) {

        return null;

    }

    const metadata =
        parseRestoOrderMetadata(
            order.metadata_json
        );

    return (
        order.staff_requested_at ||
        order.assistance_requested_at ||
        metadata.staff_requested_at ||
        metadata.assistance_requested_at ||
        metadata.requests?.staff?.requested_at ||
        null
    );

}

export function getRestoStaffRequestStatus(
    order
) {

    if (!order) {

        return null;

    }

    const metadata =
        parseRestoOrderMetadata(
            order.metadata_json
        );

    return (
        order.staff_request_status ||
        order.assistance_request_status ||
        metadata.staff_request_status ||
        metadata.assistance_request_status ||
        metadata.requests?.staff?.status ||
        (
            hasRestoStaffRequest(
                order
            )
                ? "pending"
                : null
        )
    );

}

export function getRestoStaffRequestAttendedBy(
    order
) {

    if (!order) {

        return null;

    }

    const metadata =
        parseRestoOrderMetadata(
            order.metadata_json
        );

    return (
        order.staff_request_attended_by ||
        order.assistance_attended_by ||
        metadata.staff_request_attended_by ||
        metadata.assistance_attended_by ||
        metadata.requests?.staff?.attended_by ||
        null
    );

}
