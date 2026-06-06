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

export async function POST(req) {

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

            rsvp_id,
            status

        } = body;

        // =========================
        // VALIDATION
        // =========================

        if (!rsvp_id) {

            return Response.json(
                {
                    error:
                        "rsvp_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!status) {

            return Response.json(
                {
                    error:
                        "status requerido"
                },
                {
                    status: 400
                }
            );
        }

        const allowedStatuses = [

            "pending",
            "confirmed",
            "declined"

        ];

        if (
            !allowedStatuses.includes(
                status
            )
        ) {

            return Response.json(
                {
                    error:
                        "Status inválido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // LOAD RSVP
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    r.id,
                    r.status AS current_status,
                    r.invitation_guest_id,

                    g.id AS guest_id,
                    g.attendee_id,
                    g.invitation_id,

                    i.event_id,

                    e.business_id

                FROM
                    tags_event_invitation_rsvps r

                INNER JOIN
                    tags_event_invitation_guests g
                        ON g.id =
                        r.invitation_guest_id

                INNER JOIN
                    tags_event_invitations i
                        ON i.id =
                        g.invitation_id

                INNER JOIN
                    tags_events e
                        ON e.id =
                        i.event_id

                WHERE
                    r.id = ?

                LIMIT 1
                `,
                [
                    rsvp_id
                ]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "RSVP no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const rsvp =
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
                    "invitations.rsvps.view"
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

        if (
            session.role !== "admin"
            &&
            rsvp.business_id !==
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
        // DATES
        // =========================

        let confirmedAt =
            null;

        let declinedAt =
            null;

        if (
            status ===
            "confirmed"
        ) {

            confirmedAt =
                new Date();
        }

        if (
            status ===
            "declined"
        ) {

            declinedAt =
                new Date();
        }

        // =========================
        // RSVP
        // =========================

        await db.query(
            `
            UPDATE
                tags_event_invitation_rsvps
            SET

                status = ?,

                responded_at = NOW()

            WHERE
                id = ?
            `,
            [

                status,
                rsvp_id

            ]
        );

        // =========================
        // GUEST
        // =========================

        await db.query(
            `
            UPDATE
                tags_event_invitation_guests
            SET

                rsvp_status = ?,

                confirmed_at =
                    CASE
                        WHEN ? = 'confirmed'
                        THEN NOW()
                        ELSE confirmed_at
                    END,

                updated_at = NOW()

            WHERE
                id = ?
            `,
            [

                status,
                status,
                rsvp.guest_id

            ]
        );

        // =========================
        // ATTENDEE
        // =========================

        await db.query(
            `
            UPDATE
                tags_event_attendees
            SET

                status = ?,

                confirmed_at = ?,

                declined_at = ?,

                updated_at = NOW()

            WHERE
                id = ?
            `,
            [

                status,

                confirmedAt,

                declinedAt,

                rsvp.attendee_id

            ]
        );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                rsvp.event_id,

            actionCode:
                "invitations.rsvps.update-status",

            entityType:
                "rsvp",

            entityId:
                rsvp_id,

            description:
                `RSVP actualizado a ${status}`,

            metadata: {

                previous_status:
                    rsvp.current_status,

                new_status:
                    status,

                attendee_id:
                    rsvp.attendee_id,

                guest_id:
                    rsvp.guest_id

            },

            req

        });

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            rsvp_id,

            previous_status:
                rsvp.current_status,

            new_status:
                status

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