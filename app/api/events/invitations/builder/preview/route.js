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

                    i.*,

                    e.id AS event_id,
                    e.name AS event_name,
                    e.starts_at,
                    e.location,

                    e.business_id

                FROM
                    tags_event_invitations i

                INNER JOIN
                    tags_events e
                        ON e.id =
                        i.event_id

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
                    "invitations.update"
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
        // THEME
        // =========================

        let theme = null;

        if (
            invitation.theme_id
        ) {

            const [themes] =
                await db.query(
                    `
                    SELECT
                        *
                    FROM
                        tags_event_invitation_themes
                    WHERE
                        id = ?
                    LIMIT 1
                    `,
                    [
                        invitation.theme_id
                    ]
                );

            theme =
                themes[0] || null;
        }

        // =========================
        // SEO
        // =========================

        const [seoRows] =
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
                    invitation_id
                ]
            );

        // =========================
        // STYLES
        // =========================

        const [styleRows] =
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
                    invitation_id
                ]
            );

        // =========================
        // BLOCKS
        // =========================

        const [blocks] =
            await db.query(
                `
                SELECT

                    b.id,

                    b.block_type_id,

                    bt.code,
                    bt.name,

                    b.title,

                    b.position,

                    b.config_json

                FROM
                    tags_event_invitation_blocks b

                INNER JOIN
                    tags_event_invitation_block_types bt
                        ON bt.id =
                        b.block_type_id

                WHERE
                    b.invitation_id = ?

                ORDER BY
                    b.position ASC
                `,
                [
                    invitation_id
                ]
            );

        // =========================
        // MEDIA
        // =========================

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
                    position ASC
                `,
                [
                    invitation_id
                ]
            );

        // =========================
        // PREVIEW GUEST
        // =========================

        const previewGuest = {

            id: 0,

            attendee_id: 0,

            name:
                "Invitado de prueba",

            email:
                "preview@tags.com.ar",

            phone:
                "",

            rsvp_status:
                "pending",

            personalized_message:
                "",

            max_companions:
                2

        };

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            preview: true,

            invitation: {

                id:
                    invitation.id,

                title:
                    invitation.title,

                slug:
                    invitation.slug,

                config_json:
                    invitation.config_json,

                event: {

                    id:
                        invitation.event_id,

                    name:
                        invitation.event_name,

                    starts_at:
                        invitation.starts_at,

                    location:
                        invitation.location

                }

            },

            guest:
                previewGuest,

            companions: [],

            theme,

            seo:
                seoRows[0] || null,

            styles:
                styleRows[0] || null,

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