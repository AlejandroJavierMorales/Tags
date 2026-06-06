export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

function safeParseJSON(value) {

    if (!value) return {};

    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch (err) {
        return {};
    }
}

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const token =
            searchParams.get("token");

        if (!token) {

            return Response.json(
                {
                    error: "token requerido"
                },
                {
                    status: 400
                }
            );
        }

        const [guests] =
            await db.query(
                `
                SELECT
                    g.id,
                    g.invitation_id,
                    g.attendee_id,
                    g.access_token,
                    g.personalized_message,
                    g.max_companions,
                    g.rsvp_status,
                    g.viewed_at,
                    g.confirmed_at,

                    a.name,
                    a.email,
                    a.phone,
                    a.plus_ones_allowed,
                    a.plus_ones_confirmed,
                    a.dietary_notes,
                    a.custom_dietary_notes,

                    i.id AS invitation_id,
                    i.title,
                    i.slug,
                    i.template_id,
                    i.theme_id,
                    i.settings_json,
                    i.published_at,
                    i.is_active,

                    e.id AS event_id,
                    e.name AS event_name,
                    e.starts_at,
                    e.location

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

        if (!guests.length) {

            return Response.json(
                {
                    error: "Invitación no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const guest =
            guests[0];

        if (
            !guest.published_at
            ||
            Number(guest.is_active) !== 1
        ) {

            return Response.json(
                {
                    error: "Invitación no publicada"
                },
                {
                    status: 403
                }
            );
        }

        const settings =
            safeParseJSON(
                guest.settings_json
            );

        const [blocks] =
            await db.query(
                `
                SELECT
                    id,
                    type,
                    title,
                    position,
                    config_json,
                    is_active,
                    created_at,
                    updated_at
                FROM
                    tags_event_invitation_blocks
                WHERE
                    invitation_id = ?
                    AND is_active = 1
                ORDER BY
                    position ASC,
                    id ASC
                `,
                [
                    guest.invitation_id
                ]
            );

        const [media] =
            await db.query(
                `
                SELECT
                    id,
                    type,
                    file_url,
                    position,
                    alt_text,
                    mime_type,
                    width,
                    height
                FROM
                    tags_event_invitation_media
                WHERE
                    invitation_id = ?
                ORDER BY
                    position ASC,
                    id ASC
                `,
                [
                    guest.invitation_id
                ]
            );

        let theme = null;

        if (guest.theme_id) {

            const [themes] =
                await db.query(
                    `
                    SELECT
                        id,
                        name,
                        slug,
                        config_json
                    FROM
                        tags_event_invitation_themes
                    WHERE
                        id = ?
                    LIMIT 1
                    `,
                    [
                        guest.theme_id
                    ]
                );

            theme =
                themes[0] || null;
        }

        const [seo] =
            await db.query(
                `
                SELECT
                    *
                FROM
                    tags_event_invitation_seo
                WHERE
                    invitation_id = ?
                LIMIT 1
                `,
                [
                    guest.invitation_id
                ]
            );

        const [customStyles] =
            await db.query(
                `
                SELECT
                    *
                FROM
                    tags_event_invitation_custom_styles
                WHERE
                    invitation_id = ?
                LIMIT 1
                `,
                [
                    guest.invitation_id
                ]
            );

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

            ok: true,

            invitation: {

                id:
                    guest.invitation_id,

                title:
                    guest.title,

                slug:
                    guest.slug,

                settings_json:
                    guest.settings_json,

                styles:
                    settings.styles || {},

                event: {

                    id:
                        guest.event_id,

                    name:
                        guest.event_name,

                    starts_at:
                        guest.starts_at,

                    location:
                        guest.location
                }
            },

            guest: {

                id:
                    guest.id,

                attendee_id:
                    guest.attendee_id,

                name:
                    guest.name,

                email:
                    guest.email,

                phone:
                    guest.phone,

                rsvp_status:
                    guest.rsvp_status,

                personalized_message:
                    guest.personalized_message,

                max_companions:
                    guest.max_companions,

                viewed_at:
                    guest.viewed_at,

                confirmed_at:
                    guest.confirmed_at,

                plus_ones_allowed:
                    guest.plus_ones_allowed,

                plus_ones_confirmed:
                    guest.plus_ones_confirmed,

                dietary_notes:
                    guest.dietary_notes,

                custom_dietary_notes:
                    guest.custom_dietary_notes
            },

            companions,

            theme,

            seo:
                seo[0] || null,

            styles:
                settings.styles || {},

            custom_styles:
                customStyles[0] || null,

            blocks,

            media
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