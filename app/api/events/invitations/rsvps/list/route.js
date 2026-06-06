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

        const status =
            searchParams.get(
                "status"
            );

        // =========================
        // VALIDATION
        // =========================

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
        // FILTERS
        // =========================

        let where = `
            WHERE
                g.invitation_id = ?
        `;

        const params = [
            invitation_id
        ];

        if (status) {

            where += `
                AND r.status = ?
            `;

            params.push(
                status
            );
        }

        // =========================
        // QUERY
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    r.id,

                    r.status,

                    r.companions_count,

                    r.dietary_notes,

                    r.message,

                    r.responded_at,

                    r.created_at,

                    g.id AS guest_id,

                    g.personalized_message,

                    a.id AS attendee_id,

                    a.name,

                    a.email,

                    a.phone,

                    a.plus_ones_allowed,

                    a.plus_ones_confirmed,

                    a.status AS attendee_status,

                    a.invitation_status

                FROM
                    tags_event_invitation_rsvps r

                INNER JOIN
                    tags_event_invitation_guests g
                        ON g.id =
                        r.invitation_guest_id

                INNER JOIN
                    tags_event_attendees a
                        ON a.id =
                        g.attendee_id

                ${where}

                ORDER BY

                    r.responded_at DESC,
                    r.created_at DESC
                `,
                params
            );

        // =========================
        // STATS
        // =========================

        const stats = {

            total:
                rows.length,

            pending:
                rows.filter(
                    x =>
                        x.status ===
                        "pending"
                ).length,

            confirmed:
                rows.filter(
                    x =>
                        x.status ===
                        "confirmed"
                ).length,

            declined:
                rows.filter(
                    x =>
                        x.status ===
                        "declined"
                ).length,

            companions:
                rows.reduce(
                    (
                        acc,
                        item
                    ) =>
                        acc +
                        (
                            item.companions_count
                            || 0
                        ),
                    0
                )
        };

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            invitation_id,

            stats,

            total:
                rows.length,

            items:
                rows

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