export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db,
    getCashActor,
    getCashShiftSummary,
    getRestoCashStore,
    requireOpenCashShift,
    roundCash
} from "@/app/modules/resto/lib/cash/restoCashService";
import { getRestoAccess, restoAccessResponse } from "@/app/modules/resto/lib/staff/getRestoAccess";

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

        const declaredCash =
            roundCash(
                body?.declared_cash
            );

        const notes =
            String(
                body?.notes ||
                ""
            ).trim() ||
            null;

        if (
            !businessId ||
            declaredCash < 0
        ) {
            return Response.json(
                {
                    error:
                        "El efectivo declarado es inválido"
                },
                {
                    status:
                        400
                }
            );
        }

        const access = await getRestoAccess({ businessId, permission: "cash.close" });
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

        const summary =
            await getCashShiftSummary(
                connection,
                shift
            );

        const difference =
            roundCash(
                declaredCash -
                summary.expected_cash
            );

        const actor =
            getCashActor(req);

        await connection.query(
            `
            UPDATE tags_resto_cash_shifts
            SET
                status = 'closed',
                expected_cash = ?,
                declared_cash = ?,
                difference_amount = ?,
                closing_notes = ?,
                closed_by_user_id = ?,
                closed_by_name = ?,
                closed_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
            AND store_id = ?
            AND status = 'open'
            `,
            [
                summary.expected_cash,
                declaredCash,
                difference,
                notes,
                actor.id,
                actor.name,
                shift.id,
                store.id
            ]
        );

        await connection.commit();

        return Response.json({
            ok:
                true,
            expected_cash:
                summary.expected_cash,
            declared_cash:
                declaredCash,
            difference_amount:
                difference
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
                    "No se pudo cerrar la caja"
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
