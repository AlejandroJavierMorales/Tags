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
    recordDeliveryEvent,
    roundDeliveryMoney
} from "@/app/modules/resto/lib/delivery/restoDeliveryService";

const VALID_METHODS = [
    "cash",
    "transfer",
    "card",
    "mercado_pago",
    "other"
];

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

        const deliveryId =
            Number(
                body?.deliveryId
            );

        const amount =
            roundDeliveryMoney(
                body?.amount
            );

        const paymentMethod =
            String(
                body?.paymentMethod ||
                "cash"
            ).trim().toLowerCase();

        const notes =
            String(
                body?.notes ||
                ""
            ).trim() ||
            null;

        if (
            !businessId ||
            !deliveryId ||
            amount <= 0 ||
            !VALID_METHODS.includes(
                paymentMethod
            )
        ) {
            return Response.json(
                {
                    error:
                        "Datos de rendición inválidos"
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
                    "delivery.remittance"
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

        const cashShift =
            await requireOpenCashShift(
                connection,
                store.id,
                {
                    lock:
                        true
                }
            );

        const [deliveryRows] =
            await connection.query(
                `
                SELECT
                    d.*,
                    s.order_number
                FROM tags_resto_deliveries d
                INNER JOIN tags_resto_sessions s
                    ON s.id = d.session_id
                    AND s.store_id = d.store_id
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

        if (
            !delivery ||
            !delivery.assigned_staff_id
        ) {
            throw Object.assign(
                new Error(
                    "Entrega o repartidor no encontrado"
                ),
                {
                    status:
                        404
                }
            );
        }

        const pending =
            roundDeliveryMoney(
                Number(
                    delivery.collected_amount
                ) -
                Number(
                    delivery.remitted_amount
                )
            );

        if (
            pending <= 0 ||
            amount > pending
        ) {
            throw Object.assign(
                new Error(
                    `El importe pendiente de rendición es ${Math.max(pending, 0)}`
                ),
                {
                    status:
                        409
                }
            );
        }

        const actor =
            getCashActor(req);

        const [movementResult] =
            await connection.query(
                `
                INSERT INTO tags_resto_cash_movements (
                    store_id,
                    cash_shift_id,
                    session_id,
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
                    'delivery_collection',
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
                    paymentMethod,
                    amount,
                    notes ||
                        `Rendición ${delivery.order_number}`,
                    actor.id,
                    actor.name
                ]
            );

        const [remittanceResult] =
            await connection.query(
                `
                INSERT INTO tags_resto_delivery_remittances (
                    store_id,
                    delivery_id,
                    staff_id,
                    cash_shift_id,
                    cash_movement_id,
                    amount,
                    payment_method,
                    notes,
                    received_by_user_id,
                    received_by_name,
                    occurred_at,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `,
                [
                    store.id,
                    delivery.id,
                    delivery.assigned_staff_id,
                    cashShift.id,
                    movementResult.insertId,
                    amount,
                    paymentMethod,
                    notes,
                    actor.id,
                    actor.name
                ]
            );

        const newRemitted =
            roundDeliveryMoney(
                Number(
                    delivery.remitted_amount
                ) +
                amount
            );

        const collectionStatus =
            newRemitted >=
                roundDeliveryMoney(
                    delivery.collected_amount
                )
                ? "remitted"
                : "partial_remittance";

        await connection.query(
            `
            UPDATE tags_resto_deliveries
            SET
                remitted_amount = ?,
                collection_status = ?,
                updated_at = NOW()
            WHERE id = ?
            AND store_id = ?
            LIMIT 1
            `,
            [
                newRemitted,
                collectionStatus,
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
                    "remittance",
                access,
                notes,
                metadata: {
                    amount,
                    payment_method:
                        paymentMethod,
                    collection_status:
                        collectionStatus
                }
            }
        );

        await logRestoAudit(
            connection,
            {
                storeId:
                    store.id,
                access,
                actionCode:
                    "delivery.remittance.created",
                entityType:
                    "delivery_remittance",
                entityId:
                    remittanceResult.insertId,
                description:
                    delivery.order_number,
                metadata: {
                    delivery_id:
                        delivery.id,
                    cash_movement_id:
                        movementResult.insertId,
                    amount,
                    payment_method:
                        paymentMethod
                },
                req
            }
        );

        await connection.commit();

        return Response.json({
            ok:
                true,
            pending_amount:
                roundDeliveryMoney(
                    pending -
                    amount
                ),
            collection_status:
                collectionStatus
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
                    "No se pudo registrar la rendición"
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
