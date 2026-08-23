// =====================================
// FILE: /app/api/resto/admin/waiter/route.js
// Descripción:
// Cola operativa y acciones de la pantalla de Mozo.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";
import { getRestoAccess, restoAccessResponse } from "@/app/modules/resto/lib/staff/getRestoAccess";
import { logRestoAudit } from "@/app/modules/resto/lib/staff/restoAudit";
import {
    assertRestoSessionCanClose
} from "@/app/modules/resto/lib/orders/restoSessionClose";

import {
    getNormalizedOrders
} from "@/app/modules/resto/lib/orders/getNormalizedOrders";

function clean(value) {

    return String(
        value || ""
    ).trim();

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
                    "waiter.view"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        const {
            store,
            orders
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

        const activeOrders =
            orders.filter(
                order =>
                    ![
                        "closed",
                        "cancelled"
                    ].includes(
                        order.session_status
                    )
            );

        const deliveries =
            activeOrders
                .map(
                    order => ({
                        ...order,
                        ready_items:
                            order.items.filter(
                                item =>
                                    item.preparation_status ===
                                    "ready"
                            )
                    })
                )
                .filter(
                    order =>
                        order.ready_items.length >
                        0
                );

        const kitchenOrders =
            activeOrders.filter(
                order =>
                    order.order_status ===
                    "preparing"
            );

        const tableRequests =
            activeOrders.filter(
                order =>
                    order.session_status ===
                    "pending_activation"
            );

        const onlineOrders =
            activeOrders.filter(
                order =>
                    order.session_status ===
                    "pending_confirmation"
            );

        const calls =
            activeOrders.filter(
                order =>
                    order.staff_requested
            );

        const bills =
            activeOrders.filter(
                order =>
                    order.bill_requested
            );

        const closableOrders =
            activeOrders.filter(
                order =>
                    safeNumber(
                        order.pending_amount
                    ) <= 0 &&
                    !order.bill_requested &&
                    !order.staff_requested &&
                    !order.items.some(
                        item =>
                            [
                                "pending",
                                "sent",
                                "ready"
                            ].includes(
                                item.preparation_status
                            )
                    )
            );

        return Response.json({
            ok:
                true,
            store,
            table_requests:
                tableRequests,
            online_orders:
                onlineOrders,
            deliveries,
            kitchen_orders:
                kitchenOrders,
            calls,
            bills,
            closable_orders:
                closableOrders,
            stats: {
                deliveries:
                    deliveries.length,
                ready_items:
                    deliveries.reduce(
                        (
                            total,
                            order
                        ) =>
                            total +
                            order.ready_items.reduce(
                                (
                                    subtotal,
                                    item
                                ) =>
                                    subtotal +
                                    safeNumber(
                                        item.quantity
                                    ),
                                0
                            ),
                        0
                    ),
                calls:
                    calls.length,
                bills:
                    bills.length,
                closable:
                    closableOrders.length,
                table_requests:
                    tableRequests.length,
                online_orders:
                    onlineOrders.length
            }
        });

    } catch (err) {

        console.error(
            "RESTO WAITER LIST ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error cargando la pantalla de Mozo"
            },
            {
                status:
                    err.status ||
                    500
            }
        );

    }

}

export async function POST(
    req
) {

    const connection =
        await db.getConnection();

    let transactionStarted =
        false;

    try {

        const body =
            await req.json();

        const businessId =
            clean(
                body?.businessId
            );

        const orderId =
            Number(
                body?.orderId
            );

        const action =
            clean(
                body?.action
            ).toLowerCase();

        if (
            !businessId ||
            !Number.isInteger(
                orderId
            ) ||
            orderId <= 0
        ) {

            return Response.json(
                {
                    error:
                        "businessId y orderId son requeridos"
                },
                {
                    status:
                        400
                }
            );

        }

        if (
            ![
                "serve_ready",
                "serve_item",
                "resolve_call",
                "resolve_bill",
                "activate_session",
                "confirm_order",
                "cancel_session",
                "close_session"
            ].includes(
                action
            )
        ) {

            return Response.json(
                {
                    error:
                        "Acción inválida"
                },
                {
                    status:
                        400
                }
            );

        }

        const requiredPermission =
            [
                "serve_ready",
                "serve_item"
            ].includes(action)
                ? [
                    "waiter.serve",
                    "orders.deliver"
                ]
                : [
                    "resolve_call",
                    "resolve_bill"
                ].includes(action)
                    ? "waiter.resolve"
                    : [
                        "activate_session",
                        "confirm_order"
                    ].includes(action)
                        ? "tables.open"
                        : action === "close_session"
                            ? "tables.close"
                            : "orders.cancel";

        const access = await getRestoAccess({ businessId, permission: requiredPermission });
        if (!access.allowed) return restoAccessResponse(access);

        await connection.beginTransaction();

        transactionStarted =
            true;

        const [
            storeRows
        ] =
            await connection.query(
                `
                SELECT id
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

        if (!store) {

            throw new Error(
                "Tags Resto no encontrado"
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
                    status,
                    payment_status,
                    service_mode
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

        if (!session) {

            await connection.rollback();

            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        "Pedido no encontrado"
                },
                {
                    status:
                        404
                }
            );

        }

        let affected =
            0;
        let autoClosed =
            false;

        if (
            action ===
            "activate_session" ||
            action ===
            "confirm_order"
        ) {

            const expectedStatus =
                action ===
                    "activate_session"
                    ? "pending_activation"
                    : "pending_confirmation";

            if (
                session.status !==
                expectedStatus
            ) {

                throw new Error(
                    "La sesión ya no está pendiente de confirmación"
                );

            }

            const [result] =
                await connection.query(
                    `
                    UPDATE tags_resto_sessions
                    SET
                        status = 'open',
                        confirmed_at = NOW(),
                        opened_at = NOW(),
                        updated_at = NOW()
                    WHERE id = ?
                    `,
                    [
                        session.id
                    ]
                );

            affected =
                result.affectedRows || 0;

            await connection.query(
                `
                UPDATE tags_resto_session_items
                SET preparation_status = 'ready'
                WHERE session_id = ?
                AND requires_preparation = 0
                AND preparation_status = 'pending'
                `,
                [
                    session.id
                ]
            );

        } else if (
            action ===
            "close_session"
        ) {

            await assertRestoSessionCanClose(
                connection,
                session.id
            );

            const [
                blockingItemRows
            ] =
                await connection.query(
                    `
                    SELECT COUNT(*) AS total
                    FROM tags_resto_session_items
                    WHERE session_id = ?
                    AND preparation_status IN (
                        'pending',
                        'sent',
                        'ready'
                    )
                    `,
                    [
                        session.id
                    ]
                );

            if (
                Number(
                    blockingItemRows[0]?.total ||
                    0
                ) > 0
            ) {

                throw new Error(
                    "Todavía hay productos pendientes, en preparación o sin entregar"
                );

            }

            const [
                paymentRows
            ] =
                await connection.query(
                    `
                    SELECT
                        total,
                        paid_total
                    FROM tags_resto_sessions
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [
                        session.id
                    ]
                );

            const payment =
                paymentRows[0] ||
                {};

            if (
                Number(
                    payment.paid_total ||
                    0
                ) <
                Number(
                    payment.total ||
                    0
                )
            ) {

                throw new Error(
                    "La sesión todavía tiene saldo pendiente"
                );

            }

            const [
                result
            ] =
                await connection.query(
                    `
                    UPDATE tags_resto_sessions
                    SET
                        status = 'closed',
                        closed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = ?
                    AND status NOT IN (
                        'closed',
                        'cancelled'
                    )
                    `,
                    [
                        session.id
                    ]
                );

            affected =
                result.affectedRows ||
                0;

            await connection.query(
                `
                UPDATE tags_resto_service_requests
                SET
                    status = 'resolved',
                    resolved_at = NOW()
                WHERE session_id = ?
                AND status IN (
                    'pending',
                    'acknowledged'
                )
                `,
                [
                    session.id
                ]
            );

        } else if (
            action ===
            "cancel_session"
        ) {

            if (
                session.payment_status ===
                "paid"
            ) {

                throw new Error(
                    "Una sesión pagada requiere una devolución"
                );

            }

            const reason =
                clean(
                    body?.reason
                );

            if (!reason) {

                throw new Error(
                    "El motivo de cancelación es requerido"
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
                ) > 0
            ) {

                throw new Error(
                    "No se puede cancelar un pedido con productos listos o entregados"
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

            const [result] =
                await connection.query(
                    `
                    UPDATE tags_resto_sessions
                    SET
                        status = 'cancelled',
                        cancellation_reason = ?,
                        cancelled_at = NOW(),
                        updated_at = NOW()
                    WHERE id = ?
                    `,
                    [
                        reason,
                        session.id
                    ]
                );

            affected =
                result.affectedRows || 0;

        } else if (
            action ===
            "serve_item"
        ) {

            const itemId =
                Number(
                    body?.itemId
                );

            if (
                !Number.isInteger(
                    itemId
                ) ||
                itemId <= 0
            ) {

                throw new Error(
                    "Producto inválido"
                );

            }

            const [
                result
            ] =
                await connection.query(
                    `
                    UPDATE tags_resto_session_items
                    SET preparation_status = 'served'
                    WHERE id = ?
                    AND session_id = ?
                    AND (
                        preparation_status = 'ready'
                        OR (
                            requires_preparation = 0
                            AND preparation_status = 'pending'
                        )
                    )
                    `,
                    [
                        itemId,
                        session.id
                    ]
                );

            affected =
                result.affectedRows ||
                0;

            if (!affected) {

                throw new Error(
                    "El producto ya no está disponible para entregar"
                );

            }

        } else if (
            action ===
            "serve_ready"
        ) {

            const [
                result
            ] =
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
                        session.id
                    ]
                );

            affected =
                result.affectedRows ||
                0;

        } else {

            const requestType =
                action ===
                "resolve_call"
                    ? "call_waiter"
                    : "request_bill";

            const [
                result
            ] =
                await connection.query(
                    `
                    UPDATE tags_resto_service_requests
                    SET
                        status = 'resolved',
                        resolved_at = NOW()
                    WHERE session_id = ?
                    AND request_type = ?
                    AND status IN (
                        'pending',
                        'acknowledged'
                    )
                    `,
                    [
                        session.id,
                        requestType
                    ]
                );

            affected =
                result.affectedRows ||
                0;

        }

        await connection.query(
            `
            UPDATE tags_resto_sessions
            SET updated_at = NOW()
            WHERE id = ?
            `,
            [
                session.id
            ]
        );

        if (
            [
                "serve_ready",
                "serve_item"
            ].includes(action)
        ) {

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
                AND s.payment_status = 'paid'
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
                    session.id
                ]
            );

            autoClosed =
                Number(
                    autoCloseResult?.affectedRows ||
                    0
                ) > 0;

        }

        const auditActions = {
            activate_session:
                "table.session.activated",
            confirm_order:
                "order.confirmed",
            close_session:
                "table.session.closed",
            cancel_session:
                "table.session.cancelled",
            serve_ready:
                "order.ready_items.served",
            serve_item:
                "order.item.served",
            resolve_call:
                "service.call.resolved",
            resolve_bill:
                "service.bill.resolved"
        };

        await logRestoAudit(
            connection,
            {
                storeId:
                    store.id,
                access,
                actionCode:
                    auditActions[action],
                entityType:
                    "session",
                entityId:
                    session.id,
                description:
                    `Acción operativa: ${action}`,
                metadata: {
                    affected,
                    previousStatus:
                        session.status
                },
                req
            }
        );

        if (autoClosed) {

            await logRestoAudit(
                connection,
                {
                    storeId:
                        store.id,
                    access,
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

        await connection.commit();

        transactionStarted =
            false;

        return Response.json({
            ok:
                true,
            action,
            affected
        });

    } catch (err) {

        if (transactionStarted) {

            try {

                await connection.rollback();

            } catch {

                // Se conserva el error original.

            }

        }

        console.error(
            "RESTO WAITER ACTION ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error actualizando la pantalla de Mozo"
            },
            {
                status:
                    500
            }
        );

    } finally {

        connection.release();

    }

}
