export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

import {
    getCashActor,
    requireOpenCashShift
} from "@/app/modules/resto/lib/cash/restoCashService";

import {
    getRestoAccess,
    restoAccessResponse
} from "@/app/modules/resto/lib/staff/getRestoAccess";

import {
    logRestoAudit
} from "@/app/modules/resto/lib/staff/restoAudit";

import {
    calculateDeliveryCommission,
    ensureDeliveryRecords,
    getDeliveryStore,
    recordDeliveryEvent,
    roundDeliveryMoney,
    syncDeliveryOperationalStates
} from "@/app/modules/resto/lib/delivery/restoDeliveryService";

const ACTION_PERMISSIONS = {
    assign: "delivery.assign",
    picked_up: "delivery.status",
    in_transit: "delivery.status",
    delivered: "delivery.status",
    failed: "delivery.status",
    cancel: "delivery.status"
};

const VALID_TRANSITIONS = {
    picked_up: [
        "ready_for_dispatch",
        "assigned"
    ],
    in_transit: [
        "picked_up"
    ],
    delivered: [
        "picked_up",
        "in_transit"
    ],
    failed: [
        "assigned",
        "picked_up",
        "in_transit"
    ],
    cancel: [
        "pending_confirmation",
        "preparing",
        "ready_for_dispatch",
        "assigned",
        "picked_up"
    ]
};

function getRequestedBusinessId(req) {
    return String(
        new URL(req.url)
            .searchParams
            .get("businessId") ||
        ""
    ).trim();
}

export async function GET(req) {
    let connection;

    try {
        const businessId =
            getRequestedBusinessId(req);

        if (!businessId) {
            return Response.json(
                {
                    error:
                        "Falta businessId"
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
                    "delivery.view"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        connection =
            await db.getConnection();

        const store =
            await getDeliveryStore(
                connection,
                businessId
            );

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

        await ensureDeliveryRecords(
            connection,
            store.id
        );

        await syncDeliveryOperationalStates(
            connection,
            store.id
        );

        const driverOnly =
            access.isStaff &&
            access.staff?.role_code ===
                "delivery_driver";

        const [
            deliveryRows
        ] =
            await connection.query(
                `
                SELECT
                    d.*,
                    s.order_number,
                    s.status AS session_status,
                    s.payment_status,
                    s.paid_total,
                    s.total,
                    s.customer_name,
                    s.customer_phone,
                    s.customer_email,
                    s.customer_address,
                    s.customer_zip,
                    s.notes AS order_notes,
                    s.created_at AS ordered_at,
                    st.name AS driver_name,
                    st.email AS driver_email,
                    st.phone AS driver_phone,
                    dp.can_collect,
                    COALESCE(items.total_quantity, 0)
                        AS total_quantity,
                    COALESCE(items.pending_quantity, 0)
                        AS pending_quantity,
                    COALESCE(items.ready_quantity, 0)
                        AS ready_quantity,
                    COALESCE(items.served_quantity, 0)
                        AS served_quantity,
                    COALESCE(items.products_text, '')
                        AS products_text
                FROM tags_resto_deliveries d
                INNER JOIN tags_resto_sessions s
                    ON s.id = d.session_id
                    AND s.store_id = d.store_id
                LEFT JOIN tags_resto_staff st
                    ON st.id = d.assigned_staff_id
                    AND st.store_id = d.store_id
                LEFT JOIN tags_resto_delivery_profiles dp
                    ON dp.id = d.delivery_profile_id
                    AND dp.store_id = d.store_id
                LEFT JOIN (
                    SELECT
                        session_id,
                        SUM(
                            CASE
                                WHEN preparation_status <> 'cancelled'
                                THEN quantity
                                ELSE 0
                            END
                        ) AS total_quantity,
                        SUM(
                            CASE
                                WHEN preparation_status IN ('pending', 'sent')
                                THEN quantity
                                ELSE 0
                            END
                        ) AS pending_quantity,
                        SUM(
                            CASE
                                WHEN preparation_status = 'ready'
                                THEN quantity
                                ELSE 0
                            END
                        ) AS ready_quantity,
                        SUM(
                            CASE
                                WHEN preparation_status = 'served'
                                THEN quantity
                                ELSE 0
                            END
                        ) AS served_quantity,
                        GROUP_CONCAT(
                            CASE
                                WHEN preparation_status <> 'cancelled'
                                THEN CONCAT(quantity, ' × ', title)
                                ELSE NULL
                            END
                            ORDER BY id
                            SEPARATOR ', '
                        ) AS products_text
                    FROM tags_resto_session_items
                    GROUP BY session_id
                ) items
                    ON items.session_id = s.id
                WHERE d.store_id = ?
                AND (
                    ? = 0
                    OR d.assigned_staff_id = ?
                )
                ORDER BY
                    CASE d.status
                        WHEN 'ready_for_dispatch' THEN 1
                        WHEN 'assigned' THEN 2
                        WHEN 'picked_up' THEN 3
                        WHEN 'in_transit' THEN 4
                        WHEN 'preparing' THEN 5
                        WHEN 'pending_confirmation' THEN 6
                        ELSE 7
                    END,
                    COALESCE(d.ready_at, d.created_at),
                    d.id
                `,
                [
                    store.id,
                    driverOnly
                        ? 1
                        : 0,
                    driverOnly
                        ? access.staff.id
                        : 0
                ]
            );

        const driverRows =
            driverOnly
                ? []
                : (
                    await connection.query(
                `
                SELECT
                    dp.*,
                    st.name,
                    st.email,
                    st.phone
                FROM tags_resto_delivery_profiles dp
                INNER JOIN tags_resto_staff st
                    ON st.id = dp.staff_id
                    AND st.store_id = dp.store_id
                WHERE dp.store_id = ?
                AND dp.is_active = 1
                AND st.status = 'active'
                ORDER BY st.name
                `,
                [
                    store.id
                ]
                    )
                )[0];

        return Response.json({
            ok:
                true,
            store,
            permissions:
                access.permissions,
            deliveries:
                deliveryRows.map(
                    delivery => ({
                        ...delivery,
                        total:
                            roundDeliveryMoney(
                                delivery.total
                            ),
                        paid_total:
                            roundDeliveryMoney(
                                delivery.paid_total
                            ),
                        amount_to_collect:
                            roundDeliveryMoney(
                                delivery.amount_to_collect
                            ),
                        collected_amount:
                            roundDeliveryMoney(
                                delivery.collected_amount
                            ),
                        remitted_amount:
                            roundDeliveryMoney(
                                delivery.remitted_amount
                            ),
                        commission_amount:
                            roundDeliveryMoney(
                                delivery.commission_amount
                            )
                    })
                ),
            drivers:
                driverRows
        });
    } catch (error) {
        console.error(
            "RESTO DELIVERY LIST ERROR:",
            error
        );

        return Response.json(
            {
                error:
                    error.message ||
                    "No se pudo consultar Delivery"
            },
            {
                status:
                    error.status ||
                    500
            }
        );
    } finally {
        connection?.release();
    }
}

export async function POST(req) {
    let connection;

    try {
        const body =
            await req.json();

        const businessId =
            String(
                body?.businessId ||
                ""
            ).trim();

        const action =
            String(
                body?.action ||
                ""
            ).trim().toLowerCase();

        const deliveryId =
            Number(
                body?.deliveryId
            );

        if (
            !businessId ||
            !deliveryId ||
            !ACTION_PERMISSIONS[action]
        ) {
            return Response.json(
                {
                    error:
                        "Acción de Delivery inválida"
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
                    ACTION_PERMISSIONS[action]
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        connection =
            await db.getConnection();

        await connection.beginTransaction();

        const store =
            await getDeliveryStore(
                connection,
                businessId,
                {
                    lock:
                        true
                }
            );

        if (!store) {
            throw Object.assign(
                new Error(
                    "Tags Resto no encontrado"
                ),
                {
                    status:
                        404
                }
            );
        }

        await ensureDeliveryRecords(
            connection,
            store.id
        );

        await syncDeliveryOperationalStates(
            connection,
            store.id
        );

        const [
            deliveryRows
        ] =
            await connection.query(
                `
                SELECT
                    d.*,
                    s.order_number,
                    s.status AS session_status,
                    s.payment_status,
                    s.paid_total,
                    s.total,
                    dp.can_collect
                FROM tags_resto_deliveries d
                INNER JOIN tags_resto_sessions s
                    ON s.id = d.session_id
                    AND s.store_id = d.store_id
                LEFT JOIN tags_resto_delivery_profiles dp
                    ON dp.id = d.delivery_profile_id
                    AND dp.store_id = d.store_id
                WHERE d.id = ?
                AND d.store_id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [
                    deliveryId,
                    store.id
                ]
            );

        const delivery =
            deliveryRows[0];

        if (!delivery) {
            throw Object.assign(
                new Error(
                    "Entrega no encontrada"
                ),
                {
                    status:
                        404
                }
            );
        }

        const fromStatus =
            String(
                delivery.status
            );

        const driverOnly =
            access.isStaff &&
            access.staff?.role_code ===
                "delivery_driver";

        if (
            driverOnly &&
            Number(
                delivery.assigned_staff_id
            ) !==
            Number(
                access.staff.id
            )
        ) {
            throw Object.assign(
                new Error(
                    "Esta entrega no está asignada a tu usuario"
                ),
                {
                    status:
                        403
                }
            );
        }

        if (
            driverOnly &&
            [
                "assign",
                "cancel"
            ].includes(action)
        ) {
            throw Object.assign(
                new Error(
                    "Esta acción requiere autorización administrativa"
                ),
                {
                    status:
                        403
                }
            );
        }

        if (action === "assign") {
            await assignDelivery({
                connection,
                store,
                delivery,
                body,
                access
            });
        } else {
            if (
                [
                    "picked_up",
                    "in_transit",
                    "delivered"
                ].includes(action) &&
                !delivery.assigned_staff_id
            ) {
                throw Object.assign(
                    new Error(
                        "Asigná un repartidor antes de continuar"
                    ),
                    {
                        status:
                            409
                    }
                );
            }

            const allowedFrom =
                VALID_TRANSITIONS[action] ||
                [];

            if (
                !allowedFrom.includes(
                    fromStatus
                )
            ) {
                throw Object.assign(
                    new Error(
                        `No se puede ejecutar esta acción desde el estado "${fromStatus}"`
                    ),
                    {
                        status:
                            409
                    }
                );
            }

            if (action === "delivered") {
                await completeDelivery({
                    connection,
                    store,
                    delivery,
                    body,
                    access,
                    req
                });
            } else {
                await updateDeliveryStatus({
                    connection,
                    store,
                    delivery,
                    action,
                    body,
                    access
                });
            }
        }

        await logRestoAudit(
            connection,
            {
                storeId:
                    store.id,
                access,
                actionCode:
                    `delivery.${action}`,
                entityType:
                    "delivery",
                entityId:
                    delivery.id,
                description:
                    delivery.order_number,
                metadata: {
                    from_status:
                        fromStatus,
                    driver_id:
                        body?.staffId ||
                        delivery.assigned_staff_id ||
                        null
                },
                req
            }
        );

        await connection.commit();

        return Response.json({
            ok:
                true
        });
    } catch (error) {
        if (connection) {
            await connection
                .rollback()
                .catch(() => {});
        }

        console.error(
            "RESTO DELIVERY ACTION ERROR:",
            error
        );

        return Response.json(
            {
                error:
                    error.message ||
                    "No se pudo actualizar la entrega"
            },
            {
                status:
                    error.status ||
                    500
            }
        );
    } finally {
        connection?.release();
    }
}

async function assignDelivery({
    connection,
    store,
    delivery,
    body,
    access
}) {
    const staffId =
        Number(
            body?.staffId
        );

    if (!staffId) {
        throw Object.assign(
            new Error(
                "Seleccioná un repartidor"
            ),
            {
                status:
                    400
            }
        );
    }

    if (
        [
            "delivered",
            "cancelled"
        ].includes(
            delivery.status
        )
    ) {
        throw Object.assign(
            new Error(
                "La entrega ya está finalizada"
            ),
            {
                status:
                    409
            }
        );
    }

    const [
        profileRows
    ] =
        await connection.query(
            `
            SELECT
                dp.*,
                st.name
            FROM tags_resto_delivery_profiles dp
            INNER JOIN tags_resto_staff st
                ON st.id = dp.staff_id
                AND st.store_id = dp.store_id
                WHERE dp.store_id = ?
                AND dp.staff_id = ?
                AND dp.is_active = 1
                AND dp.availability_status <> 'unavailable'
                AND st.status = 'active'
            LIMIT 1
            `,
            [
                store.id,
                staffId
            ]
        );

    const profile =
        profileRows[0];

    if (!profile) {
        throw Object.assign(
            new Error(
                "El personal seleccionado no es un repartidor activo"
            ),
            {
                status:
                    409
            }
        );
    }

    const nextStatus =
        [
            "ready_for_dispatch",
            "failed"
        ].includes(
            delivery.status
        )
            ? "assigned"
            : delivery.status;

    const commission =
        calculateDeliveryCommission(
            profile,
            delivery.total
        );

    if (
        delivery.delivery_profile_id &&
        Number(
            delivery.delivery_profile_id
        ) !==
        Number(
            profile.id
        )
    ) {
        await connection.query(
            `
            UPDATE tags_resto_delivery_profiles
            SET
                availability_status = 'available',
                updated_at = NOW()
            WHERE id = ?
            AND store_id = ?
            LIMIT 1
            `,
            [
                delivery.delivery_profile_id,
                store.id
            ]
        );
    }

    await connection.query(
        `
        UPDATE tags_resto_delivery_profiles
        SET
            availability_status = 'busy',
            updated_at = NOW()
        WHERE id = ?
        AND store_id = ?
        LIMIT 1
        `,
        [
            profile.id,
            store.id
        ]
    );

    await connection.query(
        `
        UPDATE tags_resto_deliveries
        SET
            delivery_profile_id = ?,
            assigned_staff_id = ?,
            status = ?,
            commission_amount = ?,
            commission_status = ?,
            assigned_at = NOW(),
            issue_notes = CASE
                WHEN ? = 'failed'
                THEN NULL
                ELSE issue_notes
            END,
            updated_at = NOW()
        WHERE id = ?
        AND store_id = ?
        LIMIT 1
        `,
        [
            profile.id,
            staffId,
            nextStatus,
            commission,
            commission > 0
                ? "pending"
                : "not_applicable",
            delivery.status,
            delivery.id,
            store.id
        ]
    );

    await recordDeliveryEvent(
        connection,
        {
            storeId:
                store.id,
            deliveryId:
                delivery.id,
            eventType:
                "assigned",
            fromStatus:
                delivery.status,
            toStatus:
                nextStatus,
            access,
            notes:
                profile.name,
            metadata: {
                staff_id:
                    staffId,
                commission
            }
        }
    );
}

async function updateDeliveryStatus({
    connection,
    store,
    delivery,
    action,
    body,
    access
}) {
    const statusByAction = {
        picked_up:
            "picked_up",
        in_transit:
            "in_transit",
        failed:
            "failed",
        cancel:
            "cancelled"
    };

    const dateColumnByAction = {
        picked_up:
            "picked_up_at",
        in_transit:
            "in_transit_at",
        failed:
            "failed_at",
        cancel:
            "cancelled_at"
    };

    const nextStatus =
        statusByAction[action];

    const dateColumn =
        dateColumnByAction[action];

    const notes =
        String(
            body?.notes ||
            ""
        ).trim() ||
        null;

    if (
        [
            "failed",
            "cancel"
        ].includes(action) &&
        !notes
    ) {
        throw Object.assign(
            new Error(
                "Indicá el motivo"
            ),
            {
                status:
                    400
            }
        );
    }

    await connection.query(
        `
        UPDATE tags_resto_deliveries
        SET
            status = ?,
            ${dateColumn} = NOW(),
            issue_notes = CASE
                WHEN ? IN ('failed', 'cancel')
                THEN ?
                ELSE issue_notes
            END,
            updated_at = NOW()
        WHERE id = ?
        AND store_id = ?
        LIMIT 1
        `,
        [
            nextStatus,
            action,
            notes,
            delivery.id,
            store.id
        ]
    );

    if (
        [
            "failed",
            "cancel"
        ].includes(action) &&
        delivery.delivery_profile_id
    ) {
        await connection.query(
            `
            UPDATE tags_resto_delivery_profiles
            SET
                availability_status = 'available',
                updated_at = NOW()
            WHERE id = ?
            AND store_id = ?
            LIMIT 1
            `,
            [
                delivery.delivery_profile_id,
                store.id
            ]
        );
    }

    await recordDeliveryEvent(
        connection,
        {
            storeId:
                store.id,
            deliveryId:
                delivery.id,
            eventType:
                action,
            fromStatus:
                delivery.status,
            toStatus:
                nextStatus,
            access,
            notes
        }
    );
}

async function completeDelivery({
    connection,
    store,
    delivery,
    body,
    access,
    req
}) {
    const pendingAmount =
        roundDeliveryMoney(
            Math.max(
                Number(delivery.total) -
                Number(delivery.paid_total),
                0
            )
        );

    const collectedAmount =
        roundDeliveryMoney(
            body?.collectedAmount
        );

    const paymentMethod =
        String(
            body?.paymentMethod ||
            "cash"
        ).trim().toLowerCase();

    const validMethods = [
        "cash",
        "transfer",
        "card",
        "mercado_pago",
        "other"
    ];

    if (
        pendingAmount > 0 &&
        collectedAmount !==
            pendingAmount
    ) {
        throw Object.assign(
            new Error(
                `Debe registrarse el saldo exacto cobrado: ${pendingAmount}`
            ),
            {
                status:
                    409
            }
        );
    }

    if (
        pendingAmount > 0 &&
        Number(
            delivery.can_collect
        ) !== 1
    ) {
        throw Object.assign(
            new Error(
                "El repartidor asignado no está habilitado para cobrar"
            ),
            {
                status:
                    409
            }
        );
    }

    if (
        pendingAmount > 0 &&
        !validMethods.includes(
            paymentMethod
        )
    ) {
        throw Object.assign(
            new Error(
                "Método de cobro inválido"
            ),
            {
                status:
                    400
            }
        );
    }

    if (pendingAmount > 0) {
        const [paymentResult] =
            await connection.query(
            `
            INSERT INTO tags_resto_payments (
                session_id,
                amount,
                payment_method,
                status,
                notes,
                paid_at,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                ?,
                ?,
                'confirmed',
                ?,
                NOW(),
                NOW(),
                NOW()
            )
            `,
            [
                delivery.session_id,
                pendingAmount,
                paymentMethod,
                paymentMethod ===
                    "cash"
                    ? "Cobrado por repartidor; pendiente de rendición"
                    : "Cobro electrónico confirmado al entregar"
            ]
        );

        if (
            paymentMethod !==
            "cash"
        ) {
            const cashShift =
                await requireOpenCashShift(
                    connection,
                    store.id,
                    {
                        lock:
                            true
                    }
                );

            const actor =
                getCashActor(
                    req
                );

            await connection.query(
                `
                INSERT INTO tags_resto_cash_movements (
                    store_id,
                    cash_shift_id,
                    session_id,
                    payment_id,
                    movement_type,
                    direction,
                    payment_method,
                    amount,
                    notes,
                    created_by_user_id,
                    created_by_name,
                    occurred_at,
                    created_at
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    'order_payment',
                    'income',
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    NOW(),
                    NOW()
                )
                `,
                [
                    store.id,
                    cashShift.id,
                    delivery.session_id,
                    paymentResult.insertId,
                    paymentMethod,
                    pendingAmount,
                    "Cobro electrónico confirmado al entregar",
                    actor.id,
                    actor.name
                ]
            );
        }

        await connection.query(
            `
            UPDATE tags_resto_sessions
            SET
                paid_total = ?,
                payment_status = 'paid',
                paid_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
            AND store_id = ?
            LIMIT 1
            `,
            [
                roundDeliveryMoney(
                    Number(delivery.paid_total) +
                    pendingAmount
                ),
                delivery.session_id,
                store.id
            ]
        );
    }

    await connection.query(
        `
        UPDATE tags_resto_session_items
        SET preparation_status = 'served'
        WHERE session_id = ?
        AND (
            preparation_status = 'ready'
            OR (
                requires_preparation = 0
                AND preparation_status = 'pending'
            )
        )
        `,
        [
            delivery.session_id
        ]
    );

    await connection.query(
        `
        UPDATE tags_resto_deliveries
        SET
            status = 'delivered',
            delivered_at = NOW(),
            collected_amount =
                collected_amount + CASE
                    WHEN ? = 'cash'
                    THEN ?
                    ELSE 0
                END,
            collection_status = CASE
                WHEN ? > 0
                AND ? = 'cash'
                THEN 'pending_remittance'
                ELSE 'not_applicable'
            END,
            updated_at = NOW()
        WHERE id = ?
        AND store_id = ?
        LIMIT 1
        `,
        [
            paymentMethod,
            pendingAmount,
            pendingAmount,
            paymentMethod,
            delivery.id,
            store.id
        ]
    );

    if (
        delivery.delivery_profile_id
    ) {
        await connection.query(
            `
            UPDATE tags_resto_delivery_profiles
            SET
                availability_status = 'available',
                updated_at = NOW()
            WHERE id = ?
            AND store_id = ?
            LIMIT 1
            `,
            [
                delivery.delivery_profile_id,
                store.id
            ]
        );
    }

    await connection.query(
        `
        UPDATE tags_resto_sessions s
        SET
            s.status = 'closed',
            s.closed_at = COALESCE(s.closed_at, NOW()),
            s.updated_at = NOW()
        WHERE s.id = ?
        AND s.store_id = ?
        AND (
            s.payment_status = 'paid'
            OR ? = 0
        )
        AND NOT EXISTS (
            SELECT 1
            FROM tags_resto_session_items i
            WHERE i.session_id = s.id
            AND i.preparation_status IN ('pending', 'sent', 'ready')
        )
        `,
        [
            delivery.session_id,
            store.id,
            pendingAmount
        ]
    );

    await recordDeliveryEvent(
        connection,
        {
            storeId:
                store.id,
            deliveryId:
                delivery.id,
            eventType:
                "delivered",
            fromStatus:
                delivery.status,
            toStatus:
                "delivered",
            access,
            metadata: {
                collected_amount:
                    pendingAmount,
                payment_method:
                    pendingAmount > 0
                        ? paymentMethod
                        : null,
                pending_remittance:
                    pendingAmount > 0
            }
        }
    );
}
