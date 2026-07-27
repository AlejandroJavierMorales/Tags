export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db,
    getCashActor,
    getRestoCashStore,
    requireOpenCashShift,
    roundCash
} from "@/app/modules/resto/lib/cash/restoCashService";
import { getRestoAccess, restoAccessResponse } from "@/app/modules/resto/lib/staff/getRestoAccess";
import { logRestoAudit } from "@/app/modules/resto/lib/staff/restoAudit";

const VALID_TYPES = [
    "manual_income",
    "expense",
    "cash_withdrawal",
    "tip",
    "adjustment"
];

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

        const movementType =
            String(
                body?.movement_type ||
                ""
            ).trim().toLowerCase();

        const direction =
            String(
                body?.direction ||
                ""
            ).trim().toLowerCase();

        const expectedDirection =
            [
                "manual_income",
                "tip"
            ].includes(
                movementType
            )
                ? "income"
                : "expense";

        const paymentMethod =
            String(
                body?.payment_method ||
                "cash"
            ).trim().toLowerCase();

        const amount =
            roundCash(
                body?.amount
            );

        const notes =
            String(
                body?.notes ||
                ""
            ).trim();

        if (
            !businessId ||
            !VALID_TYPES.includes(movementType) ||
            direction !==
                expectedDirection ||
            !VALID_METHODS.includes(paymentMethod) ||
            amount <= 0 ||
            !notes
        ) {
            return Response.json(
                {
                    error:
                        "Completá tipo, importe, método y motivo"
                },
                {
                    status:
                        400
                }
            );
        }

        const access = await getRestoAccess({ businessId, permission: "cash.movement" });
        if (!access.allowed) return restoAccessResponse(access);

        connection =
            await db.getConnection();

        await connection.beginTransaction();

        const store =
            await getRestoCashStore(
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

        const shift =
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

        const [
            movementResult
        ] =
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
                ?,
                ?,
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
                shift.id,
                movementType,
                direction,
                paymentMethod,
                amount,
                notes,
                actor.id,
                actor.name
            ]
            );

        await logRestoAudit(
            connection,
            {
                storeId:
                    store.id,
                access,
                actionCode:
                    "cash.movement.created",
                entityType:
                    "cash_movement",
                entityId:
                    movementResult.insertId,
                description:
                    notes,
                metadata: {
                    movement_type:
                        movementType,
                    direction,
                    payment_method:
                        paymentMethod,
                    amount
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
                .catch(
                    () => {}
                );
        }

        return Response.json(
            {
                error:
                    error.message ||
                    "No se pudo registrar el movimiento"
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
