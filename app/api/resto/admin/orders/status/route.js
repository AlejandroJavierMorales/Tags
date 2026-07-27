// =====================================
// FILE: /app/api/resto/admin/orders/status/route.js
// Descripción:
// Actualiza el estado operativo de una sesión de Tags Resto.
// Permite enviar a cocina, marcar como listo, entregar,
// cerrar o cancelar, validando comercio, sesión y pago.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

import {
    getCashActor,
    requireOpenCashShift
} from "@/app/modules/resto/lib/cash/restoCashService";
import { getRestoAccess, restoAccessResponse } from "@/app/modules/resto/lib/staff/getRestoAccess";
import { logRestoAudit } from "@/app/modules/resto/lib/staff/restoAudit";
import {
    assertRestoSessionCanClose
} from "@/app/modules/resto/lib/orders/restoSessionClose";


function clean(
    value
) {

    return String(
        value || ""
    ).trim();

}


function normalize(
    value
) {

    return clean(
        value
    ).toLowerCase();

}


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


function mapOrderStatusToSessionStatus(
    orderStatus
) {

    const statusMap = {

        new:
            "open",

        confirmed:
            "active",

        preparing:
            "preparing",

        ready:
            "ready",

        shipped:
            "delivered",

        completed:
            "closed",

        cancelled:
            "cancelled"

    };

    return (
        statusMap[
        normalize(
            orderStatus
        )
        ] ||
        null
    );

}


function mapSessionStatusToOrderStatus(
    sessionStatus
) {

    const statusMap = {

        open:
            "new",

        active:
            "confirmed",

        preparing:
            "preparing",

        ready:
            "ready",

        delivered:
            "shipped",

        closed:
            "completed",

        cancelled:
            "cancelled"

    };

    return (
        statusMap[
        normalize(
            sessionStatus
        )
        ] ||
        normalize(
            sessionStatus
        ) ||
        "new"
    );

}


function canApplyTransition(
    currentStatus,
    nextStatus
) {

    const normalizedCurrent =
        normalize(
            currentStatus
        );

    const normalizedNext =
        normalize(
            nextStatus
        );

    if (
        normalizedCurrent ===
        normalizedNext
    ) {

        return true;

    }

    const transitions = {

        open: [
            "active",
            "preparing",
            "cancelled"
        ],

        active: [
            "preparing",
            "cancelled"
        ],

        preparing: [
            "ready",
            "cancelled"
        ],

        ready: [
            "delivered",
            "cancelled"
        ],

        delivered: [
            "closed"
        ],

        closed: [],

        cancelled: []

    };

    return (
        transitions[
        normalizedCurrent
        ] ||
        []
    ).includes(
        normalizedNext
    );

}


export async function POST(
    req
) {

    let connection =
        null;

    try {

        const body =
            await req
                .json()
                .catch(
                    () => null
                );

        const businessId =
            clean(
                body?.businessId
            );

        const orderId =
            Number(
                body?.orderId
            );

        const requestedOrderStatus =
            normalize(
                body?.order_status
            );

        const refundAmount =
            Math.round(
                (
                    safeNumber(
                        body?.refund_amount
                    ) +
                    Number.EPSILON
                ) *
                100
            ) /
            100;

        const cancellationReason =
            clean(
                body?.reason
            );

        const refundMethod =
            normalize(
                body?.refund_method ||
                "cash"
            );

        if (
            !businessId
        ) {

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

        const requiredPermission =
            requestedOrderStatus === "cancelled"
                ? "orders.cancel"
                : requestedOrderStatus === "shipped"
                    ? "orders.deliver"
                    : requestedOrderStatus === "completed"
                        ? "tables.close"
                        : "orders.items";

        const access = await getRestoAccess({ businessId, permission: requiredPermission });
        if (!access.allowed) return restoAccessResponse(access);

        if (
            requestedOrderStatus ===
                "cancelled" &&
            refundAmount > 0
        ) {
            const refundAccess =
                await getRestoAccess({
                    businessId,
                    permission:
                        "cash.refund"
                });

            if (!refundAccess.allowed) {
                return restoAccessResponse(
                    refundAccess
                );
            }
        }

        if (
            !Number.isInteger(
                orderId
            ) ||
            orderId <= 0
        ) {

            return Response.json(
                {
                    error:
                        "orderId inválido"
                },
                {
                    status:
                        400
                }
            );

        }

        if (
            !requestedOrderStatus
        ) {

            return Response.json(
                {
                    error:
                        "order_status es requerido"
                },
                {
                    status:
                        400
                }
            );

        }

        const validOrderStatuses = [
            "new",
            "confirmed",
            "preparing",
            "ready",
            "shipped",
            "completed",
            "cancelled"
        ];

        if (
            !validOrderStatuses.includes(
                requestedOrderStatus
            )
        ) {

            return Response.json(
                {
                    error:
                        "Estado de pedido inválido"
                },
                {
                    status:
                        400
                }
            );

        }

        const requestedSessionStatus =
            mapOrderStatusToSessionStatus(
                requestedOrderStatus
            );

        if (
            !requestedSessionStatus
        ) {

            return Response.json(
                {
                    error:
                        "No se pudo resolver el estado solicitado"
                },
                {
                    status:
                        400
                }
            );

        }

        connection =
            await db.getConnection();

        await connection.beginTransaction();

        const [
            storeRows
        ] =
            await connection.query(
                `
                    SELECT
                        id,
                        business_id,
                        name,
                        status,
                        app_type
                    FROM tags_stores
                    WHERE business_id = ?
                    AND app_type = 'resto'
                    LIMIT 1
                    FOR UPDATE
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0];

        if (
            !store
        ) {

            await connection.rollback();

            return Response.json(
                {
                    error:
                        "No se encontró el comercio de Tags Resto"
                },
                {
                    status:
                        404
                }
            );

        }

        const [
            sessionRows
        ] =
            await connection.query(
                `
                    SELECT
                        id,
                        order_number,
                        store_id,
                        status,
                        total,
                        payment_status,
                        paid_total,
                        paid_at,
                        created_at,
                        updated_at
                    FROM tags_resto_sessions
                    WHERE id = ?
                    AND store_id = ?
                    LIMIT 1
                    FOR UPDATE
                `,
                [
                    orderId,
                    store.id
                ]
            );

        const session =
            sessionRows[0];

        if (
            !session
        ) {

            await connection.rollback();

            return Response.json(
                {
                    error:
                        "No se encontró el pedido"
                },
                {
                    status:
                        404
                }
            );

        }

        const currentSessionStatus =
            normalize(
                session.status
            );

        if (
            !canApplyTransition(
                currentSessionStatus,
                requestedSessionStatus
            )
        ) {

            await connection.rollback();

            return Response.json(
                {
                    error:
                        `No se puede pasar el pedido de ` +
                        `"${mapSessionStatusToOrderStatus(
                            currentSessionStatus
                        )}" a "${requestedOrderStatus}"`
                },
                {
                    status:
                        409
                }
            );

        }

        if (
            requestedSessionStatus ===
            "closed"
        ) {

            await assertRestoSessionCanClose(
                connection,
                session.id
            );

            const total =
                safeNumber(
                    session.total
                );

            const paidTotal =
                safeNumber(
                    session.paid_total
                );

            if (
                paidTotal <
                total
            ) {

                await connection.rollback();

                return Response.json(
                    {
                        error:
                            "No se puede cerrar la sesión porque tiene saldo pendiente",
                        total,
                        paid_total:
                            paidTotal,
                        pending_amount:
                            Math.max(
                                total -
                                paidTotal,
                                0
                            )
                    },
                    {
                        status:
                            409
                    }
                );

            }

        }

        if (
            requestedSessionStatus ===
            "cancelled"
        ) {

            const [
                paymentRows
            ] =
                await connection.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(amount),
                            0
                        ) AS paid_total
                    FROM tags_resto_payments
                    WHERE session_id = ?
                    AND status = 'confirmed'
                    `,
                    [
                        session.id
                    ]
                );

            const [
                refundRows
            ] =
                await connection.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(amount),
                            0
                        ) AS refunded_total
                    FROM tags_resto_refunds
                    WHERE session_id = ?
                    `,
                    [
                        session.id
                    ]
                );

            const paidTotal =
                Math.round(
                    (
                        safeNumber(
                            paymentRows[0]?.paid_total ??
                            session.paid_total
                        ) +
                        Number.EPSILON
                    ) *
                    100
                ) /
                100;

            const refundedTotal =
                Math.round(
                    (
                        safeNumber(
                            refundRows[0]?.refunded_total
                        ) +
                        Number.EPSILON
                    ) *
                    100
                ) /
                100;

            const refundableAmount =
                Math.max(
                    Math.round(
                        (
                            paidTotal -
                            refundedTotal +
                            Number.EPSILON
                        ) *
                        100
                    ) /
                    100,
                    0
                );

            if (
                refundableAmount > 0 &&
                refundAmount <= 0
            ) {

                await connection.rollback();

                return Response.json(
                    {
                        error:
                            "El pedido tiene dinero cobrado y requiere registrar una devolución",
                        requires_refund:
                            true,
                        paid_total:
                            paidTotal,
                        refunded_total:
                            refundedTotal,
                        suggested_refund_amount:
                            refundableAmount
                    },
                    {
                        status:
                            409
                    }
                );

            }

            if (
                refundAmount >
                refundableAmount
            ) {

                await connection.rollback();

                return Response.json(
                    {
                        error:
                            "La devolución no puede superar el monto cobrado disponible",
                        paid_total:
                            paidTotal,
                        refunded_total:
                            refundedTotal,
                        suggested_refund_amount:
                            refundableAmount
                    },
                    {
                        status:
                            409
                    }
                );

            }

            if (!cancellationReason) {

                await connection.rollback();

                return Response.json(
                    {
                        error:
                            "El motivo de cancelación es requerido"
                    },
                    {
                        status:
                            400
                    }
                );

            }

            const [
                preparedRows
            ] =
                await connection.query(
                    `
                    SELECT COUNT(*) AS total
                    FROM tags_resto_session_items
                    WHERE session_id = ?
                    AND preparation_status IN (
                        'ready',
                        'served'
                    )
                    `,
                    [
                        session.id
                    ]
                );

            if (
                Number(
                    preparedRows[0]?.total ||
                    0
                ) > 0 &&
                paidTotal <= 0
            ) {

                await connection.rollback();

                return Response.json(
                    {
                        error:
                            "No se puede cancelar sin devolución un pedido con productos listos o entregados"
                    },
                    {
                        status: 409
                    }
                );

            }

            if (refundAmount > 0) {

                if (
                    ![
                        "cash",
                        "transfer",
                        "card",
                        "mercado_pago",
                        "other"
                    ].includes(
                        refundMethod
                    )
                ) {
                    await connection.rollback();
                    return Response.json(
                        {
                            error:
                                "Método de devolución inválido"
                        },
                        {
                            status:
                                400
                        }
                    );
                }

                const cashShift =
                    await requireOpenCashShift(
                        connection,
                        store.id,
                        {
                            lock:
                                true
                        }
                    );

                const cashActor =
                    getCashActor(req);

                const [
                    refundResult
                ] =
                    await connection.query(
                    `
                    INSERT INTO tags_resto_refunds (
                        store_id,
                        session_id,
                        amount,
                        reason,
                        refunded_at,
                        created_at
                    )
                    VALUES (
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
                        session.id,
                        refundAmount,
                        cancellationReason
                    ]
                );

                await connection.query(
                    `
                    INSERT INTO tags_resto_cash_movements (
                        store_id,
                        cash_shift_id,
                        session_id,
                        refund_id,
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
                        'order_refund',
                        'expense',
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
                        session.id,
                        refundResult.insertId,
                        refundMethod,
                        refundAmount,
                        cancellationReason,
                        cashActor.id,
                        cashActor.name
                    ]
                );

            }

            await connection.query(
                `
                UPDATE tags_resto_session_items
                SET preparation_status = 'cancelled'
                WHERE session_id = ?
                AND preparation_status IN (
                    'pending',
                    'sent'
                )
                `,
                [
                    session.id
                ]
            );

        }

        await connection.query(
            `
                UPDATE tags_resto_sessions
                SET
                    status = ?,
                    payment_status = CASE
                        WHEN ? > 0
                        THEN 'refunded'
                        ELSE payment_status
                    END,
                    cancellation_reason = CASE
                        WHEN ? = 'cancelled'
                        THEN ?
                        ELSE cancellation_reason
                    END,
                    cancelled_at = CASE
                        WHEN ? = 'cancelled'
                        THEN NOW()
                        ELSE cancelled_at
                    END,
                    closed_at = CASE
                        WHEN ? = 'closed'
                        THEN NOW()
                        ELSE closed_at
                    END,
                    updated_at = NOW()
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
            `,
            [
                requestedSessionStatus,
                refundAmount,
                requestedSessionStatus,
                cancellationReason,
                requestedSessionStatus,
                requestedSessionStatus,
                session.id,
                store.id
            ]
        );

        const [
            updatedRows
        ] =
            await connection.query(
                `
                    SELECT
                        id,
                        order_number,
                        store_id,
                        status,
                        total,
                        payment_status,
                        paid_total,
                        paid_at,
                        created_at,
                        updated_at
                    FROM tags_resto_sessions
                    WHERE id = ?
                    AND store_id = ?
                    LIMIT 1
                `,
                [
                    session.id,
                    store.id
                ]
            );

        const updatedSession =
            updatedRows[0];

        await logRestoAudit(
            connection,
            {
                storeId:
                    store.id,
                access,
                actionCode:
                    requestedSessionStatus ===
                        "cancelled"
                        ? "order.cancelled"
                        : "order.status.updated",
                entityType:
                    "order",
                entityId:
                    session.id,
                description:
                    cancellationReason ||
                    session.order_number,
                metadata: {
                    previous_status:
                        currentSessionStatus,
                    next_status:
                        requestedSessionStatus,
                    refund_amount:
                        refundAmount,
                    refund_method:
                        refundAmount > 0
                            ? refundMethod
                            : null
                },
                req
            }
        );

        await connection.commit();

        const total =
            safeNumber(
                updatedSession.total
            );

        const paidTotal =
            safeNumber(
                updatedSession.paid_total
            );

        return Response.json(
            {
                ok:
                    true,

                orderId:
                    updatedSession.id,

                order_number:
                    updatedSession.order_number ||
                    null,

                status:
                    updatedSession.status,

                session_status:
                    updatedSession.status,

                order_status:
                    mapSessionStatusToOrderStatus(
                        updatedSession.status
                    ),

                payment_status:
                    updatedSession.payment_status ||
                    "pending",

                total,

                paid_total:
                    paidTotal,

                refunded_total:
                    requestedSessionStatus === "cancelled"
                        ? refundAmount
                        : 0,

                pending_amount:
                    Math.max(
                        total -
                        paidTotal,
                        0
                    ),

                updated_at:
                    updatedSession.updated_at
            }
        );

    } catch (
        err
    ) {

        if (
            connection
        ) {

            try {

                await connection.rollback();

            } catch (
                rollbackError
            ) {

                console.error(
                    "RESTO ORDER STATUS ROLLBACK ERROR:",
                    rollbackError
                );

            }

        }

        console.error(
            "RESTO ORDER STATUS ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "No se pudo actualizar el estado del pedido"
            },
            {
                status:
                    err.status ||
                    500
            }
        );

    } finally {

        if (
            connection
        ) {

            connection.release();

        }

    }

}
