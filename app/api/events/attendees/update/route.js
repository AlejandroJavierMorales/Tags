export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

import { createEventLog }
    from "@/app/modules/e-events/lib/createEventLog";
import { calculateAttendeeSeats } from "@/app/modules/e-events/lib/calculateAttendeeSeats";

export async function PUT(req) {

    try {

        // =========================
        // SESSION
        // =========================

        const session =
            await getEventSession();

        if (!session) {

            return Response.json(
                {
                    error:
                        "Unauthorized"
                },
                {
                    status: 401
                }
            );
        }

        // =========================
        // OWNER / ADMIN
        // =========================

        const isOwner =

            session.role === "admin"
            ||
            session.role === "event_client";

        // =========================
        // STAFF PERMISSION
        // =========================

        if (!isOwner) {

            if (
                session.type !== "event_staff"
            ) {

                return Response.json(
                    {
                        error:
                            "Sin permisos"
                    },
                    {
                        status: 403
                    }
                );
            }

            const allowed =
                await staffHasPermission(

                    session.staffId,

                    "attendees.update"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos"
                    },
                    {
                        status: 403
                    }
                );
            }
        }

        // =========================
        // BODY
        // =========================

        const body =
            await req.json();

        const {

            id,

            name,
            email,
            phone,

            status,

            invitation_status,

            plus_ones_allowed,

            dietary_notes,

            internal_notes,

            table_id

        } = body;

        console.log(
            "**DATOS DE ATTENDEE A ACTUALIZAR",
            JSON.stringify(body, null, 2)
        );

        // =========================
        // VALIDATION
        // =========================

        if (!id) {

            return Response.json(
                {
                    error:
                        "ID requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // ATTENDEE
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT
                    a.*,
                    e.business_id

                FROM tags_event_attendees a

                INNER JOIN tags_events e
                    ON e.id = a.event_id

                WHERE a.id = ?

                LIMIT 1
                `,
                [id]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Invitado no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const attendee =
            rows[0];

        // =========================
        // VALIDATE OWNER
        // =========================

        if (
            attendee.business_id !==
            session.businessId
        ) {

            return Response.json(
                {
                    error:
                        "Sin permisos"
                },
                {
                    status: 403
                }
            );
        }

        // =========================
        // CALCULATE RESERVED SEATS
        // =========================

        const requestedSeats =
    await calculateAttendeeSeats(id);

        // =========================
        // VALIDATE TABLE
        // =========================

        if (table_id) {

            const [tables] =
                await db.query(
                    `
                    SELECT
                        id,
                        event_id,
                        capacity

                    FROM tags_event_tables

                    WHERE
                        id = ?
                    AND
                        event_id = ?

                    LIMIT 1
                    `,
                    [
                        table_id,
                        attendee.event_id
                    ]
                );

            if (!tables.length) {

                return Response.json(
                    {
                        error:
                            "Mesa no encontrada"
                    },
                    {
                        status: 404
                    }
                );
            }

            const table =
                tables[0];

            // =========================
            // CURRENT RESERVED
            // =========================

            const [reservedRows] =
                await db.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(seats_reserved),
                            0
                        ) AS reserved

                    FROM tags_event_attendee_tables

                    WHERE
                        table_id = ?
                    AND
                        attendee_id != ?
                    `,
                    [
                        table_id,
                        id
                    ]
                );

            const currentReserved =
                Number(
                    reservedRows[0]
                        ?.reserved || 0
                );

            // =========================
            // VALIDATE CAPACITY
            // =========================

            if (
                currentReserved +
                requestedSeats >
                table.capacity
            ) {

                return Response.json(
                    {
                        error:
                            "La mesa no tiene capacidad disponible"
                    },
                    {
                        status: 400
                    }
                );
            }
        }

        // =========================
        // UPDATE ATTENDEE
        // =========================

        await db.query(
            `
            UPDATE tags_event_attendees

            SET

                name = ?,
                email = ?,
                phone = ?,

                status = ?,

                invitation_status = ?,

                plus_ones_allowed = ?,

                dietary_notes = ?,

                internal_notes = ?

            WHERE id = ?
            `,
            [

                name,

                email || null,

                phone || null,

                status || "pending",

                invitation_status || "not_sent",

                Number(
                    plus_ones_allowed || 0
                ),

                dietary_notes || null,

                internal_notes || null,

                id
            ]
        );

        // =========================
        // REMOVE OLD TABLE RELATION
        // =========================

        await db.query(
            `
            DELETE FROM
                tags_event_attendee_tables

            WHERE attendee_id = ?
            `,
            [id]
        );

        // =========================
        // INSERT NEW TABLE RELATION
        // =========================

        if (table_id) {

            await db.query(
                `
                INSERT INTO
                    tags_event_attendee_tables
                (
                    attendee_id,
                    table_id,
                    seats_reserved
                )
                VALUES (?, ?, ?)
                `,
                [

                    id,

                    table_id,

                    requestedSeats
                ]
            );
        }

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                attendee.event_id,

            staffId:
                session.staffId || null,

            actionCode:
                "attendees.update",

            entityType:
                "attendee",

            entityId:
                id,

            description:
                `Invitado actualizado: ${name}`,

            metadata: {

                attendee_id:
                    id,

                attendee_name:
                    name,

                attendee_email:
                    email,

                attendee_phone:
                    phone,

                attendee_status:
                    status,

                invitation_status,

                plus_ones_allowed,

                dietary_notes,

                internal_notes,

                table_id,

                seats_reserved:
                    requestedSeats
            },

            req
        });

        // =========================
        // RESPONSE
        // =========================

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    err.message ||
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}