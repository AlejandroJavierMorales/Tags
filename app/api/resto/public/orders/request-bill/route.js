// =====================================
// FILE: app/api/resto/public/orders/request-bill/route.js
// Descripción:
// Registra una solicitud de cuenta de una sesión pública.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    db
} from "@/app/lib/tags-db";

export async function POST(
    req
) {

    let connection;

    try {

        const {
            sessionToken
        } =
            await req.json();

        if (!sessionToken) {

            return Response.json(
                {
                    error:
                        "sessionToken es requerido."
                },
                {
                    status:
                        400
                }
            );

        }

        connection =
            await db.getConnection();

        const [
            sessionRows
        ] =
            await connection.query(
                `
                SELECT
                    id,
                    store_id,
                    status,
                    service_mode,
                    payment_status
                FROM tags_resto_sessions
                WHERE session_token = ?
                LIMIT 1
                `,
                [
                    sessionToken
                ]
            );

        const session =
            sessionRows[0];

        if (!session) {

            return Response.json(
                {
                    error:
                        "Sesión inexistente."
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
            ].includes(session.status) ||
            session.service_mode !== "table" ||
            session.payment_status === "paid"
        ) {

            return Response.json(
                {
                    error:
                        "La cuenta solamente puede solicitarse desde una atención en mesa activa."
                },
                {
                    status:
                        400
                }
            );

        }

        const [
            activeRows
        ] =
            await connection.query(
                `
                SELECT
                    id,
                    status,
                    requested_at
                FROM tags_resto_service_requests
                WHERE session_id = ?
                AND request_type = 'request_bill'
                AND status IN (
                    'pending',
                    'acknowledged'
                )
                ORDER BY id DESC
                LIMIT 1
                `,
                [
                    session.id
                ]
            );

        let request =
            activeRows[0] ||
            null;

        if (request) {

            await connection.query(
                `
                UPDATE tags_resto_service_requests
                SET requested_at = NOW()
                WHERE id = ?
                `,
                [
                    request.id
                ]
            );

            request.requested_at =
                new Date()
                    .toISOString();

        }

        if (!request) {

            const [
                result
            ] =
                await connection.query(
                    `
                    INSERT INTO tags_resto_service_requests
                    (
                        store_id,
                        session_id,
                        request_type,
                        status,
                        requested_at
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        'request_bill',
                        'pending',
                        NOW()
                    )
                    `,
                    [
                        session.store_id,
                        session.id
                    ]
                );

            request = {
                id:
                    result.insertId,
                status:
                    "pending",
                requested_at:
                    new Date()
                        .toISOString()
            };

        }

        await connection.query(
            `
            UPDATE tags_resto_sessions
            SET
                status = 'bill_requested',
                bill_requested_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                session.id
            ]
        );

        return Response.json({
            success:
                true,
            request
        });

    } catch (error) {

        console.error(
            "RESTO REQUEST BILL ERROR:",
            error
        );

        return Response.json(
            {
                error:
                    "Error interno."
            },
            {
                status:
                    500
            }
        );

    } finally {

        connection?.release();

    }

}
