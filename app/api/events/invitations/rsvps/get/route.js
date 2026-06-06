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

        const rsvp_id =
            searchParams.get(
                "rsvp_id"
            );

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

        // =========================
        // RSVP
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    r.*,

                    g.id AS guest_id,
                    g.invitation_id,
                    g.access_token,
                    g.personalized_message,

                    a.id AS attendee_id,
                    a.name,
                    a.email,
                    a.phone,
                    a.status AS attendee_status,
                    a.plus_ones_allowed,
                    a.plus_ones_confirmed,
                    a.dietary_notes AS attendee_dietary_notes,
                    a.custom_dietary_notes,

                    i.title AS invitation_title,
                    i.event_id,

                    e.business_id,
                    e.name AS event_name

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
        // COMPANIONS
        // =========================

        const [companions] =
            await db.query(
                `
                SELECT

                    id,
                    name,
                    email,
                    phone,

                    attendee_status,

                    confirmed_at,
                    declined_at,
                    checked_in_at,

                    dietary_notes,
                    relation_type

                FROM
                    tags_event_attendee_companions

                WHERE
                    attendee_id = ?

                ORDER BY
                    created_at ASC
                `,
                [
                    rsvp.attendee_id
                ]
            );

        // =========================
        // RESTRICTIONS
        // =========================

        const [restrictions] =
            await db.query(
                `
                SELECT

                    dr.id,
                    dr.name,
                    dr.slug,
                    dr.color,
                    dr.icon,
                    dr.severity

                FROM
                    tags_event_attendee_dietary_relations rel

                INNER JOIN
                    tags_event_dietary_restrictions dr
                        ON dr.id =
                        rel.restriction_id

                WHERE
                    rel.attendee_id = ?
                `,
                [
                    rsvp.attendee_id
                ]
            );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            item: {

                ...rsvp,

                companions,

                dietary_restrictions:
                    restrictions

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