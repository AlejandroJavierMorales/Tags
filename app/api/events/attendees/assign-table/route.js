// ========================================
// /api/events/attendees/assign-table/route.js
// ========================================
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";
import { calculateAttendeeSeats } from "@/app/modules/e-events/lib/calculateAttendeeSeats";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";
import { recalculateTableSeats } from "@/app/modules/e-events/lib/recalculateTableSeats";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";



export async function POST(req) {

    try {

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

        const isOwner =

            session.role === "admin"
            ||
            session.role === "event_client";

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

                    "tables.assign"
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

        const body =
            await req.json();

        const {

            attendee_id,
            table_id

        } = body;

        if (
            !attendee_id
            ||
            !table_id
        ) {

            return Response.json(
                {
                    error:
                        "Datos incompletos"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // ATTENDEE
        // =========================

        const [attendees] =
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
                [attendee_id]
            );

        if (!attendees.length) {

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
            attendees[0];

        if (
            attendee.business_id
            !==
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
        // TABLE
        // =========================

        const [tables] =
            await db.query(
                `
                SELECT *

                FROM tags_event_tables

                WHERE id = ?

                LIMIT 1
                `,
                [table_id]
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
        // SEATS
        // =========================

        const attendeeSeats =
            await calculateAttendeeSeats(
                attendee_id
            );

        // =========================
        // CAPACITY
        // =========================

        if (
            (
                Number(table.seats_reserved)
                +
                attendeeSeats
            )
            >
            Number(table.capacity)
        ) {

            return Response.json(
                {
                    error:
                        "La mesa no tiene capacidad suficiente"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // REMOVE OLD RELATIONS
        // =========================

        const [oldRelations] =
            await db.query(
                `
                SELECT table_id

                FROM tags_event_attendee_tables

                WHERE attendee_id = ?
                `,
                [attendee_id]
            );

        await db.query(
            `
            DELETE FROM tags_event_attendee_tables

            WHERE attendee_id = ?
            `,
            [attendee_id]
        );

        // =========================
        // INSERT
        // =========================

        await db.query(
            `
            INSERT INTO tags_event_attendee_tables (

                attendee_id,
                table_id,
                seats_reserved

            )
            VALUES (?, ?, ?)
            `,
            [

                attendee_id,

                table_id,

                attendeeSeats
            ]
        );

        // =========================
        // RECALCULATE
        // =========================

        for (const item of oldRelations) {

            await recalculateTableSeats(
                item.table_id
            );
        }

        await recalculateTableSeats(
            table_id
        );

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}