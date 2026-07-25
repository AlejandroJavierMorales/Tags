// =====================================
// FILE: app/api/resto/public/orders/call-waiter/route.js
// Descripción:
// Registra un llamado al personal desde una sesión pública.
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
            sessionId,
            sessionToken,
            notes
        } =
            await req.json();

        const requestNotes =
            String(
                notes || ""
            )
                .trim()
                .slice(
                    0,
                    500
                ) ||
            null;

        if (
            !sessionId &&
            !sessionToken
        ) {

            return Response.json(
                {
                    error:
                        "sessionId o sessionToken es requerido."
                },
                {
                    status:
                        400
                }
            );

        }

        connection =
            await db.getConnection();

        const where =
            sessionId
                ? "id = ?"
                : "session_token = ?";

        const [
            sessionRows
        ] =
            await connection.query(
                `
                SELECT
                    id,
                    store_id,
                    status
                FROM tags_resto_sessions
                WHERE ${where}
                LIMIT 1
                `,
                [
                    sessionId ||
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
            [
                "closed",
                "cancelled"
            ].includes(
                session.status
            )
        ) {

            return Response.json(
                {
                    error:
                        "La sesión ya no está disponible."
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
                    notes,
                    requested_at
                FROM tags_resto_service_requests
                WHERE session_id = ?
                AND request_type = 'call_waiter'
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

        if (
            request &&
            requestNotes
        ) {

            await connection.query(
                `
                UPDATE tags_resto_service_requests
                SET notes = ?
                WHERE id = ?
                `,
                [
                    requestNotes,
                    request.id
                ]
            );

            request.notes =
                requestNotes;

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
                        notes,
                        requested_at
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        'call_waiter',
                        'pending',
                        ?,
                        NOW()
                    )
                    `,
                    [
                        session.store_id,
                        session.id,
                        requestNotes
                    ]
                );

            request = {
                id:
                    result.insertId,
                status:
                    "pending",
                notes:
                    requestNotes,
                requested_at:
                    new Date()
                        .toISOString()
            };

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

        return Response.json({
            success:
                true,
            request
        });

    } catch (error) {

        console.error(
            "RESTO CALL WAITER ERROR:",
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
