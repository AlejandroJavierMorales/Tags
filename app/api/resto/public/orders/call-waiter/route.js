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
import { sendBusinessPush } from "@/app/modules/notifications/server/sendBusinessPush";

export async function POST(
    req
) {

    let connection;

    try {

        const {
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
                    rs.id,
                    rs.store_id,
                    rs.status,
                    rs.service_mode,
                    rs.payment_status,
                    st.business_id
                FROM tags_resto_sessions rs
                INNER JOIN tags_stores st ON st.id=rs.store_id
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
                        "El llamado al personal solamente está disponible para una atención en mesa activa."
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

        await sendBusinessPush({ businessId: session.business_id, moduleCode: "resto", eventCode: "waiter_called", entityType: "service_request", entityId: request.id, title: "Llamado desde una mesa", body: request.notes || "Un cliente solicitó atención", url: `/dashboard/businesses/${session.business_id}/resto/waiter`, idempotencyKey: `resto-waiter:${request.id}`, audience: "admin" });

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
