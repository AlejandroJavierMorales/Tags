export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const token =
            searchParams.get("token");

        if (!token) {

            return Response.json(
                {
                    valid: false,
                    error: "token requerido"
                },
                {
                    status: 400
                }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT
                    g.id,
                    g.invitation_id,
                    g.attendee_id,
                    g.access_token,
                    g.rsvp_status,
                    g.viewed_at,
                    g.confirmed_at,
                    g.max_companions,

                    a.name,
                    a.email,
                    a.phone,
                    a.status,
                    a.plus_ones_allowed,
                    a.plus_ones_confirmed,

                    i.title,
                    i.slug,
                    i.published_at,
                    i.is_active,

                    e.id AS event_id,
                    e.name AS event_name

                FROM
                    tags_event_invitation_guests g

                INNER JOIN
                    tags_event_attendees a
                        ON a.id = g.attendee_id

                INNER JOIN
                    tags_event_invitations i
                        ON i.id = g.invitation_id

                INNER JOIN
                    tags_events e
                        ON e.id = i.event_id

                WHERE
                    g.access_token = ?

                LIMIT 1
                `,
                [
                    token
                ]
            );

        if (!rows.length) {

            return Response.json(
                {
                    valid: false,
                    error: "Invitación no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const guest =
            rows[0];

        if (
            !guest.published_at
            ||
            Number(guest.is_active) !== 1
        ) {

            return Response.json(
                {
                    valid: false,
                    error: "Invitación no publicada"
                },
                {
                    status: 403
                }
            );
        }

        const [companions] =
            await db.query(
                `
                SELECT
                    id,
                    name,
                    email,
                    phone,
                    attendee_status,
                    relation_type,
                    qr_token,
                    dietary_notes
                FROM
                    tags_event_attendee_companions
                WHERE
                    attendee_id = ?
                ORDER BY
                    created_at ASC
                `,
                [
                    guest.attendee_id
                ]
            );

        return Response.json({

            valid: true,

            guest: {

                id:
                    guest.id,

                attendee_id:
                    guest.attendee_id,

                invitation_id:
                    guest.invitation_id,

                name:
                    guest.name,

                email:
                    guest.email,

                phone:
                    guest.phone,

                status:
                    guest.status,

                rsvp_status:
                    guest.rsvp_status,

                viewed_at:
                    guest.viewed_at,

                confirmed_at:
                    guest.confirmed_at,

                max_companions:
                    guest.max_companions,

                plus_ones_allowed:
                    guest.plus_ones_allowed,

                plus_ones_confirmed:
                    guest.plus_ones_confirmed
            },

            invitation: {

                id:
                    guest.invitation_id,

                title:
                    guest.title,

                slug:
                    guest.slug,

                published_at:
                    guest.published_at,

                is_active:
                    guest.is_active
            },

            event: {

                id:
                    guest.event_id,

                name:
                    guest.event_name
            },

            companions
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                valid: false,
                error:
                    err.message
            },
            {
                status: 500
            }
        );
    }
}