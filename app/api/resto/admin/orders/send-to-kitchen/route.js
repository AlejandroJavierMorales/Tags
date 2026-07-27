// =====================================
// FILE: /app/api/resto/admin/orders/send-to-kitchen/route.js
// Descripción:
// Envía a preparación únicamente los productos pendientes
// de una sesión de Tags Resto y evita reenviar productos
// que ya fueron derivados a cocina.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";
import { getRestoAccess, restoAccessResponse } from "@/app/modules/resto/lib/staff/getRestoAccess";
import { logRestoAudit } from "@/app/modules/resto/lib/staff/restoAudit";

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
            safeNumber(
                body?.businessId
            );

        const orderId =
            safeNumber(
                body?.orderId
            );

        if (
            businessId <= 0 ||
            orderId <= 0
        ) {

            return Response.json(
                {
                    error:
                        "businessId y orderId son requeridos."
                },
                {
                    status:
                        400
                }
            );

        }

        const access = await getRestoAccess({ businessId, permission: "orders.items" });
        if (!access.allowed) return restoAccessResponse(access);

        connection =
            await db.getConnection();

        await connection.beginTransaction();

        /*
        |------------------------------------------------------------
        | VALIDAR TIENDA
        |------------------------------------------------------------
        */

        const [
            storeRows
        ] =
            await connection.query(
                `
                    SELECT
                    id,
                    business_id,
                    name
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
                        "No se encontró la tienda de Tags Resto."
                },
                {
                    status:
                        404
                }
            );

        }

        /*
        |------------------------------------------------------------
        | VALIDAR SESIÓN
        |------------------------------------------------------------
        */

        const [
            sessionRows
        ] =
            await connection.query(
                `
                    SELECT
                        id,
                        store_id,
                        order_number,
                        status,
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
                        "El pedido no existe o no pertenece a esta tienda."
                },
                {
                    status:
                        404
                }
            );

        }

        if (
            ![
                "open",
                "bill_requested"
            ].includes(
                session.status
            )
        ) {

            await connection.rollback();

            return Response.json(
                {
                    error:
                        "El pedido debe estar confirmado antes de enviarlo a cocina."
                },
                {
                    status:
                        409
                }
            );

        }

        /*
        |------------------------------------------------------------
        | OBTENER ÍTEMS PENDIENTES
        |------------------------------------------------------------
        */
        const [
            pendingItems
        ] =
            await connection.query(
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
                    WHERE session_id = ?
                    AND requires_preparation = 1
                    AND preparation_status = 'pending'
                    ORDER BY
                        created_at ASC,
                        id ASC
                    FOR UPDATE
                `,
                [
                    session.id
                ]
            );

        if (
            !pendingItems.length
        ) {

            await connection.rollback();

            return Response.json(
                {
                    error:
                        "Este pedido no tiene productos pendientes de preparación."
                },
                {
                    status:
                        409
                }
            );

        }

        const pendingItemIds =
            pendingItems.map(
                item =>
                    Number(
                        item.id
                    )
            );

        const placeholders =
            pendingItemIds
                .map(
                    () => "?"
                )
                .join(
                    ","
                );

        /*
        |------------------------------------------------------------
        | ENVIAR ÚNICAMENTE LOS ÍTEMS PENDIENTES
        |------------------------------------------------------------
        */

        await connection.query(
            `
                UPDATE tags_resto_session_items
                SET
                    preparation_status = 'sent',
                    preparation_sent_at = NOW()
                WHERE session_id = ?
                AND requires_preparation = 1
                AND preparation_status = 'pending'
                AND id IN (${placeholders})
            `,
            [
                session.id,
                ...pendingItemIds
            ]
        );

        /*
        |------------------------------------------------------------
        | PASAR LA SESIÓN A PREPARACIÓN
        |
        | Se contemplan los estados operativos equivalentes que ya
        | utiliza el módulo para pedidos todavía no preparados.
        |------------------------------------------------------------
        */

        await connection.query(
            `
                UPDATE tags_resto_sessions
                SET
                    updated_at = NOW()
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
            `,
            [
                session.id,
                store.id
            ]
        );

        /*
        |------------------------------------------------------------
        | LEER RESULTADO FINAL
        |------------------------------------------------------------
        */

        const [
            sentItemRows
        ] =
            await connection.query(
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
                    WHERE session_id = ?
                    AND id IN (${placeholders})
                    ORDER BY
                        created_at ASC,
                        id ASC
                `,
                [
                    session.id,
                    ...pendingItemIds
                ]
            );

        const [
            updatedSessionRows
        ] =
            await connection.query(
                `
                    SELECT
                        id,
                        store_id,
                        order_number,
                        status,
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
            updatedSessionRows[0];

        const sentUnits =
            sentItemRows.reduce(
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

        await logRestoAudit(
            connection,
            {
                storeId:
                    store.id,
                access,
                actionCode:
                    "order.sent_to_kitchen",
                entityType:
                    "session",
                entityId:
                    session.id,
                description:
                    `Pedido enviado a cocina: ${session.order_number}`,
                metadata: {
                    itemIds:
                        pendingItemIds,
                    sentUnits
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
                    updatedSession.id,

                order_number:
                    updatedSession.order_number ||
                    null,

                status:
                    updatedSession.status,

                session_status:
                    updatedSession.status,

                sent_items_count:
                    sentItemRows.length,

                sent_units:
                    sentUnits,

                sent_item_ids:
                    sentItemRows.map(
                        item =>
                            Number(
                                item.id
                            )
                    ),

                items:
                    sentItemRows,

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
                    "RESTO SEND TO KITCHEN ROLLBACK ERROR:",
                    rollbackError
                );

            }

        }

        console.error(
            "RESTO SEND TO KITCHEN ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "No se pudieron enviar los productos a preparación."
            },
            {
                status:
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
