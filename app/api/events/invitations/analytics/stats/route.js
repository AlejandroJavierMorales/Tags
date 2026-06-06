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

                INNER JOIN
                    tags_events e
                        ON e.id = i.event_id

                WHERE
                    i.id = ?

                LIMIT 1
                `,
                [
                    invitation_id
                ]
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
                    "invitations.analytics.view"
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
        // TOTAL GUESTS
        // =========================

        const [guestStats] =
            await db.query(
                `
                SELECT

                    COUNT(*) AS total_guests,

                    SUM(
                        CASE
                            WHEN rsvp_status = 'confirmed'
                            THEN 1
                            ELSE 0
                        END
                    ) AS confirmed,

                    SUM(
                        CASE
                            WHEN rsvp_status = 'declined'
                            THEN 1
                            ELSE 0
                        END
                    ) AS declined,

                    SUM(
                        CASE
                            WHEN rsvp_status = 'pending'
                            THEN 1
                            ELSE 0
                        END
                    ) AS pending

                FROM
                    tags_event_invitation_guests

                WHERE
                    invitation_id = ?
                `,
                [
                    invitation_id
                ]
            );

        // =========================
        // OPENS
        // =========================

        const [openStats] =
            await db.query(
                `
                SELECT

                    COUNT(*) AS total_opens,

                    COUNT(
                        DISTINCT guest_id
                    ) AS unique_opens

                FROM
                    tags_event_invitation_access_logs

                WHERE
                    invitation_id = ?
                `,
                [
                    invitation_id
                ]
            );

        // =========================
        // RSVP
        // =========================

        const [rsvpStats] =
            await db.query(
                `
                SELECT

                    COUNT(*) AS total_rsvps,

                    SUM(
                        companions_count
                    ) AS companions

                FROM
                    tags_event_invitation_rsvps r

                INNER JOIN
                    tags_event_invitation_guests g
                        ON g.id =
                        r.invitation_guest_id

                WHERE
                    g.invitation_id = ?
                `,
                [
                    invitation_id
                ]
            );

        // =========================
        // LAST OPEN
        // =========================

        const [lastOpen] =
            await db.query(
                `
                SELECT

                    g.id,
                    a.name,
                    l.created_at

                FROM
                    tags_event_invitation_access_logs l

                INNER JOIN
                    tags_event_invitation_guests g
                        ON g.id =
                        l.guest_id

                INNER JOIN
                    tags_event_attendees a
                        ON a.id =
                        g.attendee_id

                WHERE
                    l.invitation_id = ?

                ORDER BY
                    l.created_at DESC

                LIMIT 1
                `,
                [
                    invitation_id
                ]
            );

        // =========================
        // NOT OPENED
        // =========================

        const [notOpened] =
            await db.query(
                `
                SELECT
                    COUNT(*) AS total

                FROM
                    tags_event_invitation_guests

                WHERE
                    invitation_id = ?
                    AND viewed_at IS NULL
                `,
                [
                    invitation_id
                ]
            );

        // =========================
        // CONVERSION RATE
        // =========================

        const totalGuests =
            Number(
                guestStats[0]
                    ?.total_guests || 0
            );

        const confirmed =
            Number(
                guestStats[0]
                    ?.confirmed || 0
            );

        const conversionRate =
            totalGuests > 0
                ? Number(
                    (
                        confirmed
                        * 100
                        / totalGuests
                    ).toFixed(2)
                )
                : 0;

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            stats: {

                total_guests:
                    totalGuests,

                confirmed:
                    confirmed,

                declined:
                    Number(
                        guestStats[0]
                            ?.declined || 0
                    ),

                pending:
                    Number(
                        guestStats[0]
                            ?.pending || 0
                    ),

                total_opens:
                    Number(
                        openStats[0]
                            ?.total_opens || 0
                    ),

                unique_opens:
                    Number(
                        openStats[0]
                            ?.unique_opens || 0
                    ),

                total_rsvps:
                    Number(
                        rsvpStats[0]
                            ?.total_rsvps || 0
                    ),

                companions:
                    Number(
                        rsvpStats[0]
                            ?.companions || 0
                    ),

                not_opened:
                    Number(
                        notOpened[0]
                            ?.total || 0
                    ),

                conversion_rate:
                    conversionRate,

                last_open:
                    lastOpen[0] || null

            }

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