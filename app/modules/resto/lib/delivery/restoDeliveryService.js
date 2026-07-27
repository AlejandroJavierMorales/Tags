export const DELIVERY_ACTIVE_STATUSES = [
    "pending_confirmation",
    "preparing",
    "ready_for_dispatch",
    "assigned",
    "picked_up",
    "in_transit"
];

export const DELIVERY_FINAL_STATUSES = [
    "delivered",
    "failed",
    "cancelled"
];

export function roundDeliveryMoney(value) {
    const number = Number(value);

    return Math.round(
        (
            (
                Number.isFinite(number)
                    ? number
                    : 0
            ) +
            Number.EPSILON
        ) *
        100
    ) / 100;
}

export function calculateDeliveryCommission(
    profile,
    deliveryTotal
) {
    if (!profile) return 0;

    const fixed =
        roundDeliveryMoney(
            profile.fixed_amount
        );

    const percentage =
        Number(
            profile.percentage ||
            0
        );

    const percentageAmount =
        roundDeliveryMoney(
            roundDeliveryMoney(
                deliveryTotal
            ) *
            percentage /
            100
        );

    switch (
        String(
            profile.commission_type ||
            "none"
        )
    ) {
        case "fixed":
            return fixed;
        case "percentage":
            return percentageAmount;
        case "fixed_percentage":
            return roundDeliveryMoney(
                fixed +
                percentageAmount
            );
        default:
            return 0;
    }
}

export async function ensureDeliveryRecords(
    connection,
    storeId
) {
    await connection.query(
        `
        INSERT INTO tags_resto_deliveries (
            store_id,
            session_id,
            status,
            collection_required,
            amount_to_collect,
            collection_status,
            created_at,
            updated_at
        )
        SELECT
            s.store_id,
            s.id,
            CASE
                WHEN s.status IN ('cancelled', 'canceled')
                    THEN 'cancelled'
                WHEN s.status IN ('closed', 'completed')
                    THEN 'delivered'
                ELSE 'pending_confirmation'
            END,
            CASE
                WHEN COALESCE(s.total, 0) > COALESCE(s.paid_total, 0)
                    THEN 1
                ELSE 0
            END,
            GREATEST(
                COALESCE(s.total, 0) - COALESCE(s.paid_total, 0),
                0
            ),
            CASE
                WHEN COALESCE(s.total, 0) > COALESCE(s.paid_total, 0)
                    THEN 'pending_collection'
                ELSE 'not_applicable'
            END,
            COALESCE(s.created_at, NOW()),
            NOW()
        FROM tags_resto_sessions s
        WHERE s.store_id = ?
        AND s.service_mode = 'delivery'
        AND NOT EXISTS (
            SELECT 1
            FROM tags_resto_deliveries d
            WHERE d.session_id = s.id
        )
        `,
        [
            storeId
        ]
    );
}

export async function syncDeliveryOperationalStates(
    connection,
    storeId
) {
    await connection.query(
        `
        UPDATE tags_resto_deliveries d
        INNER JOIN tags_resto_sessions s
            ON s.id = d.session_id
            AND s.store_id = d.store_id
        LEFT JOIN (
            SELECT
                session_id,
                SUM(
                    CASE
                        WHEN requires_preparation = 1
                        AND preparation_status IN ('pending', 'sent')
                        THEN quantity
                        ELSE 0
                    END
                ) AS kitchen_pending,
                SUM(
                    CASE
                        WHEN requires_preparation = 1
                        AND preparation_status = 'ready'
                        THEN quantity
                        ELSE 0
                    END
                ) AS ready_quantity
            FROM tags_resto_session_items
            GROUP BY session_id
        ) item_totals
            ON item_totals.session_id = s.id
        SET
            d.status = CASE
                WHEN s.status IN ('cancelled', 'canceled')
                    THEN 'cancelled'
                WHEN s.status IN ('pending_confirmation', 'pending_activation')
                    THEN 'pending_confirmation'
                WHEN COALESCE(item_totals.kitchen_pending, 0) > 0
                    THEN 'preparing'
                WHEN d.assigned_staff_id IS NOT NULL
                    THEN 'assigned'
                ELSE 'ready_for_dispatch'
            END,
            d.ready_at = CASE
                WHEN s.status NOT IN ('pending_confirmation', 'pending_activation')
                AND COALESCE(item_totals.kitchen_pending, 0) = 0
                    THEN COALESCE(d.ready_at, NOW())
                ELSE d.ready_at
            END,
            d.amount_to_collect = GREATEST(
                COALESCE(s.total, 0) -
                COALESCE(s.paid_total, 0),
                0
            ),
            d.collection_required = CASE
                WHEN COALESCE(s.total, 0) > COALESCE(s.paid_total, 0)
                    THEN 1
                ELSE 0
            END,
            d.collection_status = CASE
                WHEN d.collected_amount > d.remitted_amount
                    THEN 'pending_remittance'
                WHEN d.collected_amount > 0
                    THEN 'remitted'
                WHEN COALESCE(s.total, 0) > COALESCE(s.paid_total, 0)
                    THEN 'pending_collection'
                ELSE 'not_applicable'
            END
        WHERE d.store_id = ?
        AND d.status IN (
            'pending_confirmation',
            'preparing',
            'ready_for_dispatch'
        )
        `,
        [
            storeId
        ]
    );
}

export async function recordDeliveryEvent(
    connection,
    {
        storeId,
        deliveryId,
        eventType,
        fromStatus = null,
        toStatus = null,
        access = null,
        notes = null,
        metadata = null
    }
) {
    await connection.query(
        `
        INSERT INTO tags_resto_delivery_events (
            store_id,
            delivery_id,
            event_type,
            from_status,
            to_status,
            actor_staff_id,
            actor_user_id,
            actor_name,
            notes,
            metadata_json,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
            storeId,
            deliveryId,
            eventType,
            fromStatus,
            toStatus,
            access?.staff?.id ||
                null,
            access?.isStaff
                ? null
                : (
                    access?.session?.user_id ||
                    access?.session?.userId ||
                    access?.session?.id ||
                    null
                ),
            access?.session?.name ||
                access?.session?.email ||
                null,
            notes,
            metadata
                ? JSON.stringify(metadata)
                : null
        ]
    );
}

export async function getDeliveryStore(
    connection,
    businessId,
    {
        lock = false
    } = {}
) {
    const [rows] =
        await connection.query(
            `
            SELECT
                id,
                business_id,
                name,
                logo_url,
                currency
            FROM tags_stores
            WHERE business_id = ?
            AND app_type = 'resto'
            LIMIT 1
            ${lock ? "FOR UPDATE" : ""}
            `,
            [
                businessId
            ]
        );

    return rows[0] || null;
}
