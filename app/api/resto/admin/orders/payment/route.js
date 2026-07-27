// =====================================
// FILE: /app/api/resto/admin/orders/payment/route.js
// Descripción:
// Registra pagos reales de sesiones de Tags Resto.
// Inserta el movimiento, recalcula el total abonado,
// actualiza el estado de pago y devuelve el saldo pendiente.
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


function roundMoney(
    value
) {

    return Math.round(
        (
            safeNumber(
                value
            ) +
            Number.EPSILON
        ) *
        100
    ) /
    100;

}


function resolvePaymentStatus(
    total,
    paidTotal
) {

    const normalizedTotal =
        roundMoney(
            total
        );

    const normalizedPaidTotal =
        roundMoney(
            paidTotal
        );

    if (
        normalizedPaidTotal <= 0
    ) {

        return "pending";

    }

    if (
        normalizedPaidTotal <
        normalizedTotal
    ) {

        return "partial";

    }

    return "paid";

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

        const amount =
            roundMoney(
                body?.amount
            );

        const paymentMethod =
            normalize(
                body?.payment_method ||
                "cash"
            );

        const notes =
            clean(
                body?.notes
            ) ||
            null;

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

        const orderPaymentAccess =
            await getRestoAccess({
                businessId,
                permission:
                    "orders.payment"
            });

        let auditAccess =
            orderPaymentAccess;

        if (!orderPaymentAccess.allowed) {
            const cashChargeAccess =
                await getRestoAccess({
                    businessId,
                    permission:
                        "cash.charge"
                });

            if (!cashChargeAccess.allowed) {
                return restoAccessResponse(
                    orderPaymentAccess.status ===
                        401
                        ? orderPaymentAccess
                        : cashChargeAccess
                );
            }

            auditAccess =
                cashChargeAccess;
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
            amount <= 0
        ) {

            return Response.json(
                {
                    error:
                        "El monto debe ser mayor a cero"
                },
                {
                    status:
                        400
                }
            );

        }

        const validPaymentMethods = [
            "cash",
            "transfer",
            "card",
            "mercado_pago",
            "other"
        ];

        if (
            !validPaymentMethods.includes(
                paymentMethod
            )
        ) {

            return Response.json(
                {
                    error:
                        "Método de pago inválido"
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
            sessionRows
        ] =
            await connection.query(
                `
                    SELECT
                        id,
                        order_number,
                        store_id,
                        status,
                        service_mode,
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

        const sessionStatus =
            normalize(
                session.status
            );

        if (
            [
                "cancelled",
                "closed",
                "pending_activation",
                "pending_confirmation"
            ].includes(
                sessionStatus
            )
        ) {

            await connection.rollback();

            return Response.json(
                {
                    error:
                        [
                            "pending_activation",
                            "pending_confirmation"
                        ].includes(
                            sessionStatus
                        )
                            ? "El pedido todavía no está habilitado para registrar cobros"
                            : "No se puede registrar un cobro en un pedido finalizado"
                },
                {
                    status:
                        409
                }
            );

        }

        const total =
            roundMoney(
                session.total
            );

        const [
            currentPaymentRows
        ] =
            await connection.query(
                `
                    SELECT
                        COALESCE(
                            SUM(amount),
                            0
                        ) AS paid_total,

                        COUNT(*) AS payment_count,

                        MAX(paid_at) AS last_payment_at
                    FROM tags_resto_payments
                    WHERE session_id = ?
                    AND status = 'confirmed'
                `,
                [
                    session.id
                ]
            );

        const currentPaymentData =
            currentPaymentRows[0] ||
            {};

        const currentPaidTotal =
            roundMoney(
                currentPaymentData.paid_total
            );

        const currentPendingAmount =
            roundMoney(
                Math.max(
                    total -
                    currentPaidTotal,
                    0
                )
            );

        if (
            currentPendingAmount <= 0
        ) {

            await connection.rollback();

            return Response.json(
                {
                    error:
                        "El pedido ya se encuentra completamente pagado"
                },
                {
                    status:
                        409
                }
            );

        }

        if (
            amount >
            currentPendingAmount
        ) {

            await connection.rollback();

            return Response.json(
                {
                    error:
                        "El monto ingresado supera el saldo pendiente",

                    total,

                    paid_total:
                        currentPaidTotal,

                    pending_amount:
                        currentPendingAmount
                },
                {
                    status:
                        409
                }
            );

        }

        const [
            insertResult
        ] =
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
                    session.id,
                    amount,
                    paymentMethod,
                    notes
                ]
            );

        const paymentId =
            insertResult.insertId;

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
                session.id,
                paymentId,
                paymentMethod,
                amount,
                notes,
                cashActor.id,
                cashActor.name
            ]
        );

        const [
            paymentSummaryRows
        ] =
            await connection.query(
                `
                    SELECT
                        COALESCE(
                            SUM(amount),
                            0
                        ) AS paid_total,

                        COUNT(*) AS payment_count,

                        MAX(paid_at) AS last_payment_at
                    FROM tags_resto_payments
                    WHERE session_id = ?
                    AND status = 'confirmed'
                `,
                [
                    session.id
                ]
            );

        const paymentSummary =
            paymentSummaryRows[0] ||
            {};

        const paidTotal =
            roundMoney(
                paymentSummary.paid_total
            );

        const paymentCount =
            Number(
                paymentSummary.payment_count ||
                0
            );

        const lastPaymentAt =
            paymentSummary.last_payment_at ||
            null;

        const paymentStatus =
            resolvePaymentStatus(
                total,
                paidTotal
            );

        const pendingAmount =
            roundMoney(
                Math.max(
                    total -
                    paidTotal,
                    0
                )
            );

        await connection.query(
            `
                UPDATE tags_resto_sessions
                SET
                    payment_status = ?,
                    paid_total = ?,
                    paid_at = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
            `,
            [
                paymentStatus,
                paidTotal,
                paymentStatus ===
                    "paid"
                    ? lastPaymentAt
                    : null,
                session.id,
                store.id
            ]
        );

        if (
            paymentStatus ===
            "paid"
        ) {

            await connection.query(
                `
                UPDATE tags_resto_service_requests
                SET
                    status = 'resolved',
                    resolved_at = NOW()
                WHERE session_id = ?
                AND request_type = 'request_bill'
                AND status IN (
                    'pending',
                    'acknowledged'
                )
                `,
                [
                    session.id
                ]
            );

            const [
                autoCloseResult
            ] =
                await connection.query(
                `
                UPDATE tags_resto_sessions s
                SET
                    s.status = 'closed',
                    s.closed_at = NOW(),
                    s.updated_at = NOW()
                WHERE s.id = ?
                AND s.store_id = ?
                AND s.service_mode IN (
                    'takeaway',
                    'delivery'
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM tags_resto_session_items i
                    WHERE i.session_id = s.id
                    AND i.preparation_status IN (
                        'pending',
                        'sent',
                        'ready'
                    )
                )
                `,
                [
                    session.id,
                    store.id
                ]
            );

            if (
                Number(
                    autoCloseResult?.affectedRows ||
                    0
                ) > 0
            ) {

                await logRestoAudit(
                    connection,
                    {
                        storeId:
                            store.id,
                        access:
                            auditAccess,
                        actionCode:
                            "session.auto_closed",
                        entityType:
                            "session",
                        entityId:
                            session.id,
                        description:
                            session.order_number,
                        metadata: {
                            reason:
                                "paid_and_fully_delivered",
                            service_mode:
                                session.service_mode
                        },
                        req
                    }
                );

            }

        }

        const [
            paymentRows
        ] =
            await connection.query(
                `
                    SELECT
                        id,
                        session_id,
                        amount,
                        payment_method,
                        status,
                        notes,
                        paid_at,
                        created_at,
                        updated_at
                    FROM tags_resto_payments
                    WHERE id = ?
                    AND session_id = ?
                    LIMIT 1
                `,
                [
                    paymentId,
                    session.id
                ]
            );

        const payment =
            paymentRows[0] ||
            null;

        await logRestoAudit(
            connection,
            {
                storeId:
                    store.id,
                access:
                    auditAccess,
                actionCode:
                    "order.payment.created",
                entityType:
                    "order",
                entityId:
                    session.id,
                description:
                    session.order_number,
                metadata: {
                    payment_id:
                        paymentId,
                    amount,
                    payment_method:
                        paymentMethod,
                    payment_status:
                        paymentStatus,
                    paid_total:
                        paidTotal
                },
                req
            }
        );

        await connection.commit();

        return Response.json(
            {
                ok:
                    true,

                orderId:
                    session.id,

                order_number:
                    session.order_number ||
                    null,

                payment,

                amount,

                payment_method:
                    paymentMethod,

                payment_status:
                    paymentStatus,

                total,

                paid_total:
                    paidTotal,

                pending_amount:
                    pendingAmount,

                payment_count:
                    paymentCount,

                paid_at:
                    paymentStatus ===
                        "paid"
                        ? lastPaymentAt
                        : null,

                last_payment_at:
                    lastPaymentAt
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
                    "RESTO ORDER PAYMENT ROLLBACK ERROR:",
                    rollbackError
                );

            }

        }

        console.error(
            "RESTO ORDER PAYMENT ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "No se pudo registrar el cobro"
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
