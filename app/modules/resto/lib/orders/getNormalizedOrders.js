// =====================================
// FILE: /app/modules/resto/lib/orders/getNormalizedOrders.js
// Descripción:
// Carga y normaliza los pedidos administrativos de Tags Resto.
// Es una utilidad exclusiva de servidor compartida por list y get.
// =====================================

import {
    db
} from "@/app/lib/tags-db";

import {
    parseRestoOrderMetadata
} from "./restoOrderMetadata";

function normalize(value) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase();

}

function safeNumber(value) {

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

function parseJson(
    value
) {

    if (
        value &&
        typeof value === "object"
    ) {
        return value;
    }

    if (!value) {
        return {};
    }

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }

}

function mapSessionStatusToOrderStatus(
    session
) {

    const status =
        normalize(
            session?.status
        );

    if (status === "closed")
        return "completed";

    if (status === "cancelled")
        return "cancelled";

    const kitchenItems =
        (
            session?.items ||
            []
        ).filter(
            item =>
                Number(
                    item.requires_preparation
                ) === 1
        );

    const activeItems =
        (
            session?.items ||
            []
        ).filter(
            item =>
                item.preparation_status !==
                "cancelled"
        );

    if (!kitchenItems.length) {

        if (
            activeItems.length &&
            activeItems.every(
                item =>
                    item.preparation_status ===
                    "served"
            )
        ) {

            return "shipped";

        }

        if (
            activeItems.length &&
            activeItems.every(
                item =>
                    [
                        "ready",
                        "served"
                    ].includes(
                        item.preparation_status
                    )
            )
        ) {

            return "ready";

        }

        return "new";

    }

    const countStatus =
        preparationStatus =>
            kitchenItems.filter(
                item =>
                    item.preparation_status ===
                    preparationStatus
            ).length;

    const pending =
        countStatus(
            "pending"
        );

    const sent =
        countStatus(
            "sent"
        );

    const ready =
        countStatus(
            "ready"
        );

    const served =
        countStatus(
            "served"
        );

    const cancelled =
        countStatus(
            "cancelled"
        );

    if (sent > 0) {

        return "preparing";

    }

    if (pending > 0) {

        return "new";

    }

    if (
        ready +
        served +
        cancelled ===
        kitchenItems.length
    ) {

        if (
            activeItems.length &&
            activeItems.every(
                item =>
                    item.preparation_status ===
                    "served"
            )
        ) {

            return "shipped";

        }

        return "ready";

    }

    return "new";

}

function mapSessionPaymentStatus(
    session
) {

    const metadata =
        parseRestoOrderMetadata(
            session?.metadata_json
        );

    const paymentStatus =
        session?.payment_status ||
        metadata.payment_status ||
        metadata.payment?.status ||
        "pending";

    const normalizedStatus =
        normalize(
            paymentStatus
        );

    const validStatuses = [
        "pending",
        "partial",
        "paid",
        "cancelled",
        "refunded"
    ];

    return validStatuses.includes(
        normalizedStatus
    )
        ? normalizedStatus
        : "pending";

}

function normalizeSession(
    session
) {

    const metadata =
        parseRestoOrderMetadata(
            session?.metadata_json
        );

    const locationName =
        session.location_name ||
        metadata.location_name ||
        metadata.table_name ||
        null;

    const parentLocationName =
        session.parent_location_name ||
        metadata.parent_location_name ||
        null;

    const serviceMode =
        session.service_mode ||
        metadata.service_mode ||
        metadata.order_mode ||
        metadata.mode ||
        null;

    const total =
        safeNumber(
            session.total
        );

    const paidTotal =
        safeNumber(
            session.payments_paid_total ??
            session.paid_total
        );

    const refundedTotal =
        safeNumber(
            session.refunded_total
        );

    const netPaidTotal =
        Math.max(
            paidTotal -
            refundedTotal,
            0
        );

    const billRequestedAt =
        session.bill_requested_at ||
        null;

    const staffRequestedAt =
        session.staff_requested_at ||
        null;

    return {
        ...session,

        message_count:
            safeNumber(
                session.message_count
            ),

        unread_message_count:
            safeNumber(
                session.unread_message_count
            ),

        has_unanswered_messages:
            safeNumber(
                session.message_count
            ) > 0 &&
            session.last_message_sender ===
                "customer",

        id:
            session.id,

        resto_session_id:
            session.id,

        session_status:
            session.status,

        order_number:
            session.order_number ||
            null,

        order_status:
            "new",

        payment_status:
            mapSessionPaymentStatus({
                ...session,
                payment_status:
                    refundedTotal > 0
                        ? "refunded"
                        : paidTotal >= total &&
                        total > 0
                        ? "paid"
                        : paidTotal > 0
                            ? "partial"
                            : session.payment_status
            }),

        paid_total:
            paidTotal,

        refunded_total:
            refundedTotal,

        net_paid_total:
            netPaidTotal,

        pending_amount:
            Math.max(
                total -
                paidTotal,
                0
            ),

        payment_count:
            safeNumber(
                session.payment_count
            ),

        last_payment_at:
            session.last_payment_at ||
            null,

        paid_at:
            session.paid_at ||
            null,

        service_mode:
            serviceMode,

        location_id:
            session.location_id ||
            null,

        resto_location_id:
            session.location_id ||
            null,

        location_name:
            locationName,

        resto_location_name:
            locationName,

        table_name:
            session.location_type ===
                "table"
                ? locationName
                : null,

        parent_location_name:
            parentLocationName,

        items_count:
            safeNumber(
                session.items_count
            ),

        subtotal:
            safeNumber(
                session.subtotal
            ),

        total,

        bill_requested_at:
            billRequestedAt,

        bill_request_status:
            session.bill_request_status ||
            null,

        bill_requested:
            Boolean(
                billRequestedAt
            ),

        staff_requested_at:
            staffRequestedAt,

        staff_request_status:
            session.staff_request_status ||
            null,

        staff_request_notes:
            session.staff_request_notes ||
            null,

        staff_requested:
            Boolean(
                staffRequestedAt
            ),

        metadata_json:
            session.metadata_json ||
            null
    };

}

function buildKitchen(
    items
) {

    const kitchenItems =
        items.filter(
            item =>
                Number(
                    item.requires_preparation
                ) === 1
        );

    const countStatus =
        preparationStatus =>
            kitchenItems.filter(
                item =>
                    item.preparation_status ===
                    preparationStatus
            ).reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    safeNumber(
                        item.quantity
                    ),
                0
            );

    const kitchen = {
        total:
            kitchenItems.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    safeNumber(
                        item.quantity
                    ),
                0
            ),
        pending:
            countStatus(
                "pending"
            ),
        sent:
            countStatus(
                "sent"
            ),
        ready:
            countStatus(
                "ready"
            ),
        served:
            countStatus(
                "served"
            ),
        cancelled:
            countStatus(
                "cancelled"
            )
    };

    kitchen.progress =
        kitchen.total > 0
            ? Math.round(
                (
                    (
                        kitchen.ready +
                        kitchen.served
                    ) /
                    kitchen.total
                ) *
                100
            )
            : 0;

    return kitchen;

}

export async function getNormalizedOrders({
    businessId,
    paymentPendingOnly = false
}) {

    const [
        storeRows
    ] =
        await db.query(
            `
            SELECT
                id,
                business_id,
                page_id,
                slug,
                name,
                description,
                logo_url,
                email,
                whatsapp,
                address,
                status,
                app_type,
                currency,
                settings_json
            FROM tags_stores
            WHERE business_id = ?
            AND app_type = 'resto'
            LIMIT 1
            `,
            [
                businessId
            ]
        );

    const rawStore =
        storeRows[0] ||
        null;

    const storeSettings =
        parseJson(
            rawStore?.settings_json
        );

    const store =
        rawStore
            ? {
                ...rawStore,
                settings_json:
                    storeSettings,
                contact:
                    storeSettings.resto_contact ||
                    {},
                location:
                    storeSettings.resto_location ||
                    {}
            }
            : null;

    if (!store) {

        return {
            store:
                null,
            orders:
                []
        };

    }

    const [
        refundTableRows
    ] =
        await db.query(
            `
            SELECT 1
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'tags_resto_refunds'
            LIMIT 1
            `
        );

    const hasRefundsTable =
        refundTableRows.length > 0;

    const [
        messageTableRows
    ] =
        await db.query(
            `
            SELECT 1
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'tags_resto_order_messages'
            LIMIT 1
            `
        );

    const hasMessagesTable =
        messageTableRows.length > 0;

    const refundSelect =
        hasRefundsTable
            ? `
                COALESCE(
                    refunds.refunded_total,
                    0
                ) AS refunded_total
            `
            : `
                0 AS refunded_total
            `;

    const refundJoin =
        hasRefundsTable
            ? `
                LEFT JOIN (
                    SELECT
                        session_id,
                        SUM(amount) AS refunded_total
                    FROM tags_resto_refunds
                    GROUP BY session_id
                ) refunds
                    ON refunds.session_id = s.id
            `
            : "";

    const messageSelect =
        hasMessagesTable
            ? `
                COALESCE(
                    messages.message_count,
                    0
                ) AS message_count,
                COALESCE(
                    messages.unread_message_count,
                    0
                ) AS unread_message_count,
                messages.last_message_at,
                last_message.sender_type
                    AS last_message_sender,
                last_message.message
                    AS last_message_preview
            `
            : `
                0 AS message_count,
                0 AS unread_message_count,
                NULL AS last_message_at,
                NULL AS last_message_sender,
                NULL AS last_message_preview
            `;

    const messageJoin =
        hasMessagesTable
            ? `
                LEFT JOIN (
                    SELECT
                        session_id,
                        COUNT(*) AS message_count,
                        SUM(
                            sender_type = 'customer'
                            AND read_by_staff_at IS NULL
                        ) AS unread_message_count,
                        MAX(id) AS last_message_id,
                        MAX(created_at) AS last_message_at
                    FROM tags_resto_order_messages
                    GROUP BY session_id
                ) messages
                    ON messages.session_id = s.id

                LEFT JOIN tags_resto_order_messages last_message
                    ON last_message.id = messages.last_message_id
            `
            : "";

    const [
        sessionRows
    ] =
        await db.query(
            `
            SELECT
                s.*,

                l.name AS location_name,
                l.location_type,
                l.location_code,

                parent_location.name
                    AS parent_location_name,

                COALESCE(
                    items.items_count,
                    0
                ) AS items_count,

                items.products_text,

                requests.bill_requested_at,
                requests.bill_request_status,

                requests.staff_requested_at,
                requests.staff_request_status,
                requests.staff_request_notes,

                ${refundSelect},

                ${messageSelect}

            FROM tags_resto_sessions s

            LEFT JOIN tags_resto_locations l
                ON l.id = s.location_id
                AND l.store_id = s.store_id

            LEFT JOIN tags_resto_locations parent_location
                ON parent_location.id = l.parent_id
                AND parent_location.store_id = s.store_id

            LEFT JOIN (
                SELECT
                    session_id,

                    SUM(
                        COALESCE(
                            quantity,
                            0
                        )
                    ) AS items_count,

                    GROUP_CONCAT(
                        DISTINCT title
                        ORDER BY title
                        SEPARATOR ', '
                    ) AS products_text

                FROM tags_resto_session_items

                GROUP BY session_id
            ) items
                ON items.session_id = s.id

            LEFT JOIN (
                SELECT
                    session_id,

                    MAX(
                        CASE
                            WHEN request_type = 'request_bill'
                            AND status IN (
                                'pending',
                                'acknowledged'
                            )
                            THEN requested_at
                            ELSE NULL
                        END
                    ) AS bill_requested_at,

                    MAX(
                        CASE
                            WHEN request_type = 'request_bill'
                            AND status IN (
                                'pending',
                                'acknowledged'
                            )
                            THEN status
                            ELSE NULL
                        END
                    ) AS bill_request_status,

                    MAX(
                        CASE
                            WHEN request_type = 'call_waiter'
                            AND status IN (
                                'pending',
                                'acknowledged'
                            )
                            THEN requested_at
                            ELSE NULL
                        END
                    ) AS staff_requested_at,

                    MAX(
                        CASE
                            WHEN request_type = 'call_waiter'
                            AND status IN (
                                'pending',
                                'acknowledged'
                            )
                            THEN status
                            ELSE NULL
                        END
                    ) AS staff_request_status,

                    MAX(
                        CASE
                            WHEN request_type = 'call_waiter'
                            AND status IN (
                                'pending',
                                'acknowledged'
                            )
                            THEN notes
                            ELSE NULL
                        END
                    ) AS staff_request_notes

                FROM tags_resto_service_requests

                GROUP BY session_id
            ) requests
                ON requests.session_id = s.id

            ${refundJoin}

            ${messageJoin}

            WHERE s.store_id = ?
            ${
                paymentPendingOnly
                    ? `
                        AND s.status IN (
                            'open',
                            'active',
                            'preparing',
                            'ready',
                            'delivered',
                            'bill_requested'
                        )
                        AND COALESCE(
                            s.payment_status,
                            'pending'
                        ) NOT IN (
                            'paid',
                            'refunded',
                            'cancelled'
                        )
                        AND COALESCE(
                            s.total,
                            0
                        ) >
                        COALESCE(
                            s.paid_total,
                            0
                        )
                    `
                    : ""
            }

            ORDER BY
                s.created_at DESC,
                s.id DESC
            `,
            [
                store.id
            ]
        );

    const sessionIds =
        sessionRows.map(
            session =>
                session.id
        );

    let itemsBySession =
        {};

    if (sessionIds.length) {

        const [
            itemRows
        ] =
            await db.query(
                `
                SELECT
                    id,
                    session_id,
                    product_id,
                    variant_id,
                    title,
                    variant_title,
                    quantity,
                    unit_price,
                    total_price,
                    notes,
                    requires_preparation,
                    preparation_status,
                    preparation_sent_at
                FROM tags_resto_session_items
                WHERE session_id IN (${sessionIds.map(() => "?").join(",")})
                ORDER BY
                    session_id,
                    id
                `,
                sessionIds
            );

        itemsBySession =
            itemRows.reduce(
                (
                    result,
                    item
                ) => {

                    if (
                        !result[
                            item.session_id
                        ]
                    ) {

                        result[
                            item.session_id
                        ] = [];

                    }

                    result[
                        item.session_id
                    ].push(
                        item
                    );

                    return result;

                },
                {}
            );

    }

    const orders =
        sessionRows.map(
            session => {

                const items =
                    itemsBySession[
                        session.id
                    ] ||
                    [];

                const order =
                    normalizeSession(
                        session
                    );

                order.items =
                    items;

                order.currency =
                    order.currency ||
                    store.currency ||
                    "ARS";

                order.kitchen =
                    buildKitchen(
                        items
                    );

                order.order_status =
                    mapSessionStatusToOrderStatus(
                        order
                    );

                return order;

            }
        );

    return {
        store,
        orders
    };

}
