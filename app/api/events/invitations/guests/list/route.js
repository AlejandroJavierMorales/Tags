export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

export async function GET(req) {

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
        // PARAMS
        // =========================

        const { searchParams } =
            new URL(req.url);

        const invitation_id =
            searchParams.get(
                "invitation_id"
            );

        if (!invitation_id) {

            return Response.json(
                {
                    error:
                        "invitation_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // INVITATION
        // =========================

        const [invitations] =
            await db.query(
                `
                SELECT

                    i.id,
                    i.event_id,

                    e.business_id

                FROM
                    tags_event_invitations i

                INNER JOIN tags_events e
                    ON e.id = i.event_id

                WHERE
                    i.id = ?

                LIMIT 1
                `,
                [invitation_id]
            );

        if (!invitations.length) {

            return Response.json(
                {
                    error:
                        "Invitación no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const invitation =
            invitations[0];

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
                    "attendees.view"
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
        // BUSINESS SECURITY
        // =========================

        if (
            session.role !== "admin"
            &&
            invitation.business_id !==
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
        // ATTENDEES
        // =========================

        const [guests] =
            await db.query(
                `
                SELECT

                    ig.id,
                    ig.attendee_id,
                    ig.access_token,
                    ig.personalized_message,
                    ig.max_companions,
                    ig.rsvp_status,
                    ig.viewed_at,
                    ig.confirmed_at,

                    a.name,
                    a.email,
                    a.phone,
                    a.status,
                    a.plus_ones_allowed,
                    a.plus_ones_confirmed

                FROM
                    tags_event_invitation_guests ig

                INNER JOIN
                    tags_event_attendees a
                    ON a.id = ig.attendee_id

                WHERE
                    ig.invitation_id = ?

                ORDER BY
                    a.name ASC
                `,
                [invitation_id]
            );

        // =========================
        // COMPANIONS
        // =========================

        for (
            const guest
            of guests
        ) {

            const [companions] =
                await db.query(
                    `
                    SELECT

                        id,
                        name,
                        email,
                        phone,

                        attendee_status,

                        checked_in_at,
                        created_at

                    FROM
                        tags_event_attendee_companions

                    WHERE
                        attendee_id = ?

                    ORDER BY
                        name ASC
                    `,
                    [
                        guest.attendee_id
                    ]
                );

            guest.companions =
                companions;
        }

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            invitation_id,

            total:
                guests.length,

            data:
                guests

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