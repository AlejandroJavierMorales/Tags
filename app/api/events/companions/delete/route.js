export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { createEventLog }
    from "@/app/modules/e-events/lib/createEventLog";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

import { recalculateTableSeats }
    from "@/app/modules/e-events/lib/recalculateTableSeats";

export async function DELETE(req) {

    try {

        // =========================
        // SESSION
        // =========================

        const session =
            await getEventSession();

        if (!session) {

            return Response.json(
                {
                    error: "Unauthorized"
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

                    "companions.delete"
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

        const { id } = body;

        if (!id) {

            return Response.json(
                {
                    error:
                        "id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // COMPANION
        // =========================

        const [companions] =
            await db.query(
                `
                SELECT

                    c.id,
                    c.name,
                    c.event_id,
                    c.attendee_id,

                    e.business_id

                FROM
                tags_event_attendee_companions c

                INNER JOIN tags_events e
                    ON e.id = c.event_id

                WHERE
                    c.id = ?

                LIMIT 1
                `,
                [id]
            );

        if (!companions.length) {

            return Response.json(
                {
                    error:
                        "Acompañante no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const companion =
            companions[0];

        // =========================
        // BUSINESS SECURITY
        // =========================

        if (
            companion.business_id
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
        // ATTENDEE TABLE
        // =========================

        const [relations] =
            await db.query(
                `
                SELECT
                    table_id

                FROM
                    tags_event_attendee_tables

                WHERE
                    attendee_id = ?

                LIMIT 1
                `,
                [
                    companion.attendee_id
                ]
            );

        const relation =
            relations[0] || null;

        // =========================
        // DELETE COMPANION
        // =========================

        await db.query(
            `
            DELETE FROM
                tags_event_attendee_companions

            WHERE
                id = ?
            `,
            [id]
        );

        // =========================
        // RECALCULATE RESERVED SEATS
        // attendee + companions
        // =========================

        const [confirmedRows] =
            await db.query(
                `
                SELECT
                    COUNT(*) AS total

                FROM
                    tags_event_attendee_companions

                WHERE
                    attendee_id = ?
                `,
                [
                    companion.attendee_id
                ]
            );

        const companionsCount =
            Number(
                confirmedRows[0]?.total || 0
            );

        const seatsReserved =
            1 + companionsCount;

        // =========================
        // UPDATE RELATION
        // =========================

        await db.query(
            `
            UPDATE
                tags_event_attendee_tables

            SET
                seats_reserved = ?

            WHERE
                attendee_id = ?
            `,
            [
                seatsReserved,
                companion.attendee_id
            ]
        );

        // =========================
        // RECALCULATE TABLE
        // =========================

        if (relation?.table_id) {

            await recalculateTableSeats(
                relation.table_id
            );
        }

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                companion.event_id,

            actionCode:
                "companions.delete",

            entityType:
                "companion",

            entityId:
                id,

            description:
                `Acompañante eliminado: ${companion.name}`,

            metadata: {

                id,

                attendee_id:
                    companion.attendee_id,

                name:
                    companion.name,

                new_seats_reserved:
                    seatsReserved
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
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}