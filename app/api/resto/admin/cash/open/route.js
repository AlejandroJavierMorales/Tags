export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db,
    ensurePrimaryCashRegister,
    getCashActor,
    getOpenCashShift,
    getRestoCashStore,
    roundCash
} from "@/app/modules/resto/lib/cash/restoCashService";
import { getRestoAccess, restoAccessResponse } from "@/app/modules/resto/lib/staff/getRestoAccess";
import { logRestoAudit } from "@/app/modules/resto/lib/staff/restoAudit";

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

        const openingAmount =
            roundCash(
                body?.opening_amount
            );

        const notes =
            String(
                body?.notes ||
                ""
            ).trim() ||
            null;

        if (
            !businessId ||
            openingAmount < 0
        ) {
            return Response.json(
                {
                    error:
                        "Datos de apertura inválidos"
                },
                {
                    status:
                        400
                }
            );
        }

        const access = await getRestoAccess({ businessId, permission: "cash.open" });
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

        const existing =
            await getOpenCashShift(
                connection,
                store.id,
                {
                    lock:
                        true
                }
            );

        if (existing) {
            throw Object.assign(
                new Error(
                    "Ya existe una caja abierta"
                ),
                {
                    status:
                        409
                }
            );
        }

        const register =
            await ensurePrimaryCashRegister(
                connection,
                store.id
            );

        const actor =
            getCashActor(req);

        const [
            result
        ] =
            await connection.query(
                `
                INSERT INTO tags_resto_cash_shifts (
                    store_id,
                    cash_register_id,
                    status,
                    opening_amount,
                    opening_notes,
                    opened_by_user_id,
                    opened_by_name,
                    opened_at,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?,
                    ?,
                    'open',
                    ?,
                    ?,
                    ?,
                    ?,
                    NOW(),
                    NOW(),
                    NOW()
                )
                `,
                [
                    store.id,
                    register.id,
                    openingAmount,
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
                    "cash.opened",
                entityType:
                    "cash_shift",
                entityId:
                    result.insertId,
                description:
                    notes,
                metadata: {
                    opening_amount:
                        openingAmount
                },
                req
            }
        );

        await connection.commit();

        return Response.json({
            ok:
                true,
            shiftId:
                result.insertId
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
                    "No se pudo abrir la caja"
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
