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

        const page =
            Number(
                searchParams.get("page")
                || 1
            );

        const limit =
            Number(
                searchParams.get("limit")
                || 50
            );

        const guest_id =
            searchParams.get(
                "guest_id"
            );

        const type =
            searchParams.get(
                "type"
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
        // FILTERS
        // =========================

        let where = `
            WHERE
                l.invitation_id = ?
        `;

        const params = [
            invitation_id
        ];

        if (guest_id) {

            where += `
                AND l.guest_id = ?
            `;

            params.push(
                guest_id
            );
        }

        if (type) {

            where += `
                AND l.action_type = ?
            `;

            params.push(
                type
            );
        }

        // =========================
        // TOTAL
        // =========================

        const [countRows] =
            await db.query(
                `
                SELECT

                    COUNT(*) AS total

                FROM
                    tags_event_invitation_access_logs l

                ${where}
                `,
                params
            );

        const total =
            Number(
                countRows[0]
                    ?.total || 0
            );

        const offset =
            (
                page - 1
            ) * limit;

        // =========================
        // ITEMS
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    l.id,

                    l.action_type,

                    l.ip_address,

                    l.user_agent,

                    l.created_at,

                    g.id AS guest_id,

                    g.rsvp_status,

                    a.id AS attendee_id,

                    a.name,

                    a.email,

                    a.phone

                FROM
                    tags_event_invitation_access_logs l

                LEFT JOIN
                    tags_event_invitation_guests g
                        ON g.id =
                        l.guest_id

                LEFT JOIN
                    tags_event_attendees a
                        ON a.id =
                        g.attendee_id

                ${where}

                ORDER BY
                    l.created_at DESC

                LIMIT ?
                OFFSET ?
                `,
                [

                    ...params,

                    limit,
                    offset

                ]
            );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            pagination: {

                page,

                limit,

                total,

                pages:
                    Math.ceil(
                        total / limit
                    )

            },

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