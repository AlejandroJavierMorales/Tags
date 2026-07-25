// Cancela una sesión pública mientras ningún producto haya sido enviado.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

function clean(value) {

    return String(
        value || ""
    ).trim();

}

export async function POST(req) {

    const connection =
        await db.getConnection();

    let transactionStarted =
        false;

    try {

        const body =
            await req.json();

        const sessionToken =
            clean(
                body?.sessionToken
            );

        const reason =
            clean(
                body?.reason
            ) ||
            "Cancelado por el cliente";

        if (!sessionToken) {

            return Response.json(
                {
                    error:
                        "sessionToken es requerido"
                },
                {
                    status: 400
                }
            );

        }

        await connection.beginTransaction();
        transactionStarted = true;

        const [sessionRows] =
            await connection.query(
                `
                SELECT
                    id,
                    status,
                    payment_status,
                    paid_total
                FROM tags_resto_sessions
                WHERE session_token = ?
                LIMIT 1
                FOR UPDATE
                `,
                [
                    sessionToken
                ]
            );

        const session =
            sessionRows[0];

        if (!session) {

            await connection.rollback();
            transactionStarted = false;

            return Response.json(
                {
                    error:
                        "Sesión no encontrada"
                },
                {
                    status: 404
                }
            );

        }

        if (
            [
                "closed",
                "cancelled"
            ].includes(
                session.status
            )
        ) {

            throw new Error(
                "La sesión ya no puede cancelarse"
            );

        }

        if (
            session.payment_status !==
                "pending" ||
            Number(
                session.paid_total || 0
            ) > 0
        ) {

            throw new Error(
                "La sesión tiene pagos registrados"
            );

        }

        const [preparedRows] =
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
                preparedRows[0]?.total || 0
            ) > 0
        ) {

            await connection.rollback();
            transactionStarted = false;

            return Response.json(
                {
                    error:
                        "El pedido ya fue enviado. Solicitá la cancelación al personal."
                },
                {
                    status: 409
                }
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

        await connection.commit();
        transactionStarted = false;

        return Response.json({
            ok: true
        });

    } catch (err) {

        if (transactionStarted) {

            await connection
                .rollback()
                .catch(
                    () => {}
                );

        }

        console.error(
            "RESTO PUBLIC ORDER CANCEL ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "No se pudo cancelar la sesión"
            },
            {
                status: 409
            }
        );

    } finally {

        connection.release();

    }

}
