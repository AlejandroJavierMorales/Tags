export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db,
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
    getDeliveryStore,
    roundDeliveryMoney
} from "@/app/modules/resto/lib/delivery/restoDeliveryService";

const VALID_METHODS = [
    "cash",
    "transfer",
    "card",
    "mercado_pago",
    "other"
];

export async function GET(req) {
    try {
        const url =
            new URL(req.url);

        const businessId =
            String(
                url.searchParams.get(
                    "businessId"
                ) ||
                ""
            ).trim();

        const access =
            await getRestoAccess({
                businessId,
                permission:
                    "delivery.settlement"
            });

        if (!access.allowed) {
            return restoAccessResponse(
                access
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'resto'
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows[0];

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

        const [settlementRows] =
            await db.query(
                `
                SELECT
                    ds.*,
                    st.name AS driver_name,
                    COUNT(dsi.id) AS delivery_count
                FROM tags_resto_delivery_settlements ds
                INNER JOIN tags_resto_staff st
                    ON st.id = ds.staff_id
                    AND st.store_id = ds.store_id
                LEFT JOIN tags_resto_delivery_settlement_items dsi
                    ON dsi.settlement_id = ds.id
                WHERE ds.store_id = ?
                GROUP BY
                    ds.id,
                    ds.store_id,
                    ds.staff_id,
                    ds.cash_shift_id,
                    ds.cash_movement_id,
                    ds.status,
                    ds.period_from,
                    ds.period_to,
                    ds.commission_total,
                    ds.adjustment_amount,
                    ds.total_amount,
                    ds.payment_method,
                    ds.notes,
                    ds.created_by_user_id,
                    ds.created_by_name,
                    ds.paid_by_user_id,
                    ds.paid_by_name,
                    ds.paid_at,
                    ds.cancelled_at,
                    ds.created_at,
                    ds.updated_at,
                    st.name
                ORDER BY ds.created_at DESC
                LIMIT 200
                `,
                [
                    store.id
                ]
            );

        const [pendingRows] =
            await db.query(
                `
                SELECT
                    d.assigned_staff_id AS staff_id,
                    st.name AS driver_name,
                    COUNT(*) AS delivery_count,
                    COALESCE(
                        SUM(d.commission_amount),
                        0
                    ) AS commission_total,
                    MIN(d.delivered_at) AS first_delivery_at,
                    MAX(d.delivered_at) AS last_delivery_at
                FROM tags_resto_deliveries d
                INNER JOIN tags_resto_staff st
                    ON st.id = d.assigned_staff_id
                    AND st.store_id = d.store_id
                WHERE d.store_id = ?
                AND d.status = 'delivered'
                AND d.commission_status = 'pending'
                AND d.commission_amount > 0
                GROUP BY
                    d.assigned_staff_id,
                    st.name
                ORDER BY st.name
                `,
                [
                    store.id
                ]
            );

        return Response.json({
            ok:
                true,
            settlements:
                settlementRows,
            pending:
                pendingRows
        });
    } catch (error) {
        return Response.json(
            {
                error:
                    error.message ||
                    "No se pudieron consultar las liquidaciones"
            },
            {
                status:
                    error.status ||
                    500
            }
        );
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

        if (
            !businessId ||
            ![
                "create",
                "pay"
            ].includes(action)
        ) {
            return Response.json(
                {
                    error:
                        "Acción de liquidación inválida"
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
                    "delivery.settlement"
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

        const result =
            action === "create"
                ? await createSettlement({
                    connection,
                    store,
                    body,
                    access,
                    req
                })
                : await paySettlement({
                    connection,
                    store,
                    body,
                    access,
                    req
                });

        await connection.commit();

        return Response.json({
            ok:
                true,
            ...result
        });
    } catch (error) {
        if (connection) {
            await connection
                .rollback()
                .catch(() => {});
        }

        return Response.json(
            {
                error:
                    error.message ||
                    "No se pudo procesar la liquidación"
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

async function createSettlement({
    connection,
    store,
    body,
    access,
    req
}) {
    const staffId =
        Number(
            body?.staffId
        );

    const periodFrom =
        String(
            body?.periodFrom ||
            ""
        ).trim();

    const periodTo =
        String(
            body?.periodTo ||
            ""
        ).trim();

    const adjustment =
        roundDeliveryMoney(
            body?.adjustmentAmount
        );

    if (
        !staffId ||
        !periodFrom ||
        !periodTo
    ) {
        throw Object.assign(
            new Error(
                "Seleccioná repartidor y período"
            ),
            {
                status:
                    400
            }
        );
    }

    const [deliveryRows] =
        await connection.query(
            `
            SELECT
                id,
                commission_amount
            FROM tags_resto_deliveries
            WHERE store_id = ?
            AND assigned_staff_id = ?
            AND status = 'delivered'
            AND commission_status = 'pending'
            AND commission_amount > 0
            AND delivered_at >= ?
            AND delivered_at <= ?
            ORDER BY delivered_at, id
            FOR UPDATE
            `,
            [
                store.id,
                staffId,
                periodFrom,
                periodTo
            ]
        );

    if (!deliveryRows.length) {
        throw Object.assign(
            new Error(
                "No hay comisiones pendientes en el período"
            ),
            {
                status:
                    409
            }
        );
    }

    const commissionTotal =
        roundDeliveryMoney(
            deliveryRows.reduce(
                (
                    total,
                    delivery
                ) =>
                    total +
                    Number(
                        delivery.commission_amount
                    ),
                0
            )
        );

    const totalAmount =
        roundDeliveryMoney(
            commissionTotal +
            adjustment
        );

    if (totalAmount < 0) {
        throw Object.assign(
            new Error(
                "El ajuste no puede dejar una liquidación negativa"
            ),
            {
                status:
                    400
            }
        );
    }

    const actor =
        getCashActor(req);

    const [settlementResult] =
        await connection.query(
            `
            INSERT INTO tags_resto_delivery_settlements (
                store_id,
                staff_id,
                status,
                period_from,
                period_to,
                commission_total,
                adjustment_amount,
                total_amount,
                notes,
                created_by_user_id,
                created_by_name,
                created_at,
                updated_at
            )
            VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `,
            [
                store.id,
                staffId,
                periodFrom,
                periodTo,
                commissionTotal,
                adjustment,
                totalAmount,
                String(
                    body?.notes ||
                    ""
                ).trim() ||
                    null,
                actor.id,
                actor.name
            ]
        );

    for (const delivery of deliveryRows) {
        await connection.query(
            `
            INSERT INTO tags_resto_delivery_settlement_items (
                settlement_id,
                delivery_id,
                commission_amount,
                adjustment_amount,
                total_amount,
                created_at
            )
            VALUES (?, ?, ?, 0, ?, NOW())
            `,
            [
                settlementResult.insertId,
                delivery.id,
                delivery.commission_amount,
                delivery.commission_amount
            ]
        );
    }

    await connection.query(
        `
        UPDATE tags_resto_deliveries
        SET
            commission_status = 'settlement_draft',
            updated_at = NOW()
        WHERE id IN (?)
        AND store_id = ?
        `,
        [
            deliveryRows.map(
                delivery =>
                    delivery.id
            ),
            store.id
        ]
    );

    await logRestoAudit(
        connection,
        {
            storeId:
                store.id,
            access,
            actionCode:
                "delivery.settlement.created",
            entityType:
                "delivery_settlement",
            entityId:
                settlementResult.insertId,
            description:
                `Liquidación de ${deliveryRows.length} entregas`,
            metadata: {
                staff_id:
                    staffId,
                commission_total:
                    commissionTotal,
                adjustment_amount:
                    adjustment,
                total_amount:
                    totalAmount
            },
            req
        }
    );

    return {
        settlement_id:
            settlementResult.insertId
    };
}

async function paySettlement({
    connection,
    store,
    body,
    access,
    req
}) {
    const settlementId =
        Number(
            body?.settlementId
        );

    const paymentMethod =
        String(
            body?.paymentMethod ||
            "cash"
        ).trim().toLowerCase();

    if (
        !settlementId ||
        !VALID_METHODS.includes(
            paymentMethod
        )
    ) {
        throw Object.assign(
            new Error(
                "Datos de pago inválidos"
            ),
            {
                status:
                    400
            }
        );
    }

    const [settlementRows] =
        await connection.query(
            `
            SELECT
                ds.*,
                st.name AS driver_name
            FROM tags_resto_delivery_settlements ds
            INNER JOIN tags_resto_staff st
                ON st.id = ds.staff_id
                AND st.store_id = ds.store_id
            WHERE ds.id = ?
            AND ds.store_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [
                settlementId,
                store.id
            ]
        );

    const settlement =
        settlementRows[0];

    if (
        !settlement ||
        settlement.status !==
            "draft"
    ) {
        throw Object.assign(
            new Error(
                "La liquidación no está disponible para pagar"
            ),
            {
                status:
                    409
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

    const actor =
        getCashActor(req);

    let movementId =
        null;

    if (
        roundDeliveryMoney(
            settlement.total_amount
        ) > 0
    ) {
        const [movementResult] =
            await connection.query(
                `
                INSERT INTO tags_resto_cash_movements (
                    store_id,
                    cash_shift_id,
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
                    'delivery_settlement_payment',
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
                    paymentMethod,
                    settlement.total_amount,
                    `Liquidación repartidor: ${settlement.driver_name}`,
                    actor.id,
                    actor.name
                ]
            );

        movementId =
            movementResult.insertId;
    }

    await connection.query(
        `
        UPDATE tags_resto_delivery_settlements
        SET
            cash_shift_id = ?,
            cash_movement_id = ?,
            status = 'paid',
            payment_method = ?,
            paid_by_user_id = ?,
            paid_by_name = ?,
            paid_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
        AND store_id = ?
        LIMIT 1
        `,
        [
            cashShift.id,
            movementId,
            paymentMethod,
            actor.id,
            actor.name,
            settlement.id,
            store.id
        ]
    );

    await connection.query(
        `
        UPDATE tags_resto_deliveries d
        INNER JOIN tags_resto_delivery_settlement_items dsi
            ON dsi.delivery_id = d.id
        SET
            d.commission_status = 'paid',
            d.updated_at = NOW()
        WHERE dsi.settlement_id = ?
        AND d.store_id = ?
        `,
        [
            settlement.id,
            store.id
        ]
    );

    await logRestoAudit(
        connection,
        {
            storeId:
                store.id,
            access,
            actionCode:
                "delivery.settlement.paid",
            entityType:
                "delivery_settlement",
            entityId:
                settlement.id,
            description:
                settlement.driver_name,
            metadata: {
                amount:
                    roundDeliveryMoney(
                        settlement.total_amount
                    ),
                payment_method:
                    paymentMethod,
                cash_movement_id:
                    movementId
            },
            req
        }
    );

    return {
        settlement_id:
            settlement.id,
        cash_movement_id:
            movementId
    };
}
