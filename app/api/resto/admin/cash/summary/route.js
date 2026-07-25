export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db,
    ensurePrimaryCashRegister,
    getCashShiftSummary,
    getOpenCashShift,
    getRestoCashStore
} from "@/app/modules/resto/lib/cash/restoCashService";

export async function GET(req) {

    try {

        const {
            searchParams
        } =
            new URL(req.url);

        const businessId =
            String(
                searchParams.get(
                    "businessId"
                ) ||
                ""
            ).trim();

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

        const store =
            await getRestoCashStore(
                db,
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

        const register =
            await ensurePrimaryCashRegister(
                db,
                store.id
            );

        const shift =
            await getOpenCashShift(
                db,
                store.id
            );

        const summary =
            await getCashShiftSummary(
                db,
                shift
            );

        let movements = [];

        if (shift) {

            const [
                rows
            ] =
                await db.query(
                    `
                    SELECT
                        cm.*,
                        s.order_number
                    FROM tags_resto_cash_movements cm
                    LEFT JOIN tags_resto_sessions s
                        ON s.id = cm.session_id
                    WHERE cm.cash_shift_id = ?
                    ORDER BY
                        cm.occurred_at DESC,
                        cm.id DESC
                    LIMIT 200
                    `,
                    [
                        shift.id
                    ]
                );

            movements =
                rows;

        }

        const [
            history
        ] =
            await db.query(
                `
                SELECT
                    cs.*,
                    cr.name AS cash_register_name
                FROM tags_resto_cash_shifts cs
                INNER JOIN tags_resto_cash_registers cr
                    ON cr.id = cs.cash_register_id
                WHERE cs.store_id = ?
                ORDER BY cs.opened_at DESC
                LIMIT 30
                `,
                [
                    store.id
                ]
            );

        return Response.json({
            ok:
                true,
            store,
            register,
            shift:
                summary,
            movements,
            history
        });

    } catch (error) {

        console.error(
            "RESTO CASH SUMMARY ERROR:",
            error
        );

        return Response.json(
            {
                error:
                    error.message ||
                    "No se pudo cargar la caja"
            },
            {
                status:
                    error.status ||
                    500
            }
        );

    }

}
