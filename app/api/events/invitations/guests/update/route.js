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
                    error: "Unauthorized"
                },
                {
                    status: 401
                }
            );
        }

        // =========================
        // BODY
        // =========================

        const body =
            await req.json();

        const {

            id,

            personalized_message,

            max_companions

        } = body;

        if (!id) {

            return Response.json(
                {
                    error: "id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // GUEST
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    ig.*,

                    i.event_id,

                    e.business_id,

                    a.name

                FROM
                    tags_event_invitation_guests ig

                INNER JOIN
                    tags_event_invitations i
                    ON i.id = ig.invitation_id

                INNER JOIN
                    tags_events e
                    ON e.id = i.event_id

                INNER JOIN
                    tags_event_attendees a
                    ON a.id = ig.attendee_id

                WHERE
                    ig.id = ?

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

        const guest =
            rows[0];

        // =========================
        // PERMISSIONS
        // =========================

        const isOwner =

            session.role === "admin"
            ||
            session.role === "event_client";

        if (!isOwner) {

            if (
                session.type !==
                "event_staff"
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
                            "Sin permisos para modificar invitados"
                    },
                    {
                        status: 403
                    }
                );
            }
        }

        // =========================
        // BUSINESS SECURITY
        // =========================

        if (
            session.role !== "admin"
            &&
            guest.business_id !==
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
        // UPDATE
        // =========================

        await db.query(
            `
            UPDATE
                tags_event_invitation_guests

            SET

                personalized_message = ?,

                max_companions = ?,

                updated_at = NOW()

            WHERE
                id = ?
            `,
            [

                personalized_message ??
                guest.personalized_message,

                max_companions ??
                guest.max_companions,

                id
            ]
        );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                guest.event_id,

            actionCode:
                "invitations.guests.update",

            entityType:
                "invitation_guest",

            entityId:
                id,

            description:
                `Invitado actualizado: ${guest.name}`,

            metadata: {

                invitation_guest_id:
                    id,

                personalized_message,

                max_companions

            },

            req
        });

        return Response.json({

            ok: true

        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    err.message
            },
            {
                status: 500
            }
        );
    }
}