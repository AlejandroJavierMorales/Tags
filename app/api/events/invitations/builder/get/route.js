export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

function safeParseJSON(value) {

    if (!value) {

        return {};
    }

    if (typeof value === "object") {

        return value;
    }

    try {

        return JSON.parse(value);

    } catch (err) {

        return {};
    }
}

export async function GET(req) {

    try {

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

        const [invitations] =
            await db.query(
                `
                SELECT
                    i.*,
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

        let settings =
            safeParseJSON(
                invitation.settings_json
            );

        let styles =
            settings.styles || {};

        let header =
            settings.header || {};

        let theme = null;

        if (invitation.theme_id) {

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

        const [customStyleRows] =
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
                ORDER BY
                    position ASC
                `,
                [
                    invitation_id
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
                    size_bytes,
                    width,
                    height,
                    storage_path,
                    created_at
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

        const [statsRows] =
            await db.query(
                `
                SELECT
                    (
                        SELECT COUNT(*)
                        FROM tags_event_invitation_guests
                        WHERE invitation_id = ?
                    ) AS guests,
                    (
                        SELECT COUNT(*)
                        FROM tags_event_invitation_blocks
                        WHERE invitation_id = ?
                    ) AS blocks,
                    (
                        SELECT COUNT(*)
                        FROM tags_event_invitation_media
                        WHERE invitation_id = ?
                    ) AS media
                `,
                [
                    invitation_id,
                    invitation_id,
                    invitation_id
                ]
            );

        return Response.json({

            ok: true,

            builder: {

                invitation,

                theme,

                seo:
                    seoRows[0] || null,

                styles,

                header,

                custom_styles:
                    customStyleRows[0] || null,

                blocks,

                media,

                stats:
                    statsRows[0]
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