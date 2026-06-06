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

        const {

            invitation_id,

            theme_id,

            seo,

            styles,

            header,

            blocks

        } = body;

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

        if (theme_id) {

            await db.query(
                `
                UPDATE
                    tags_event_invitations
                SET

                    theme_id = ?,

                    updated_at = NOW()

                WHERE
                    id = ?
                `,
                [

                    theme_id,
                    invitation_id

                ]
            );
        }

        // =========================
        // SEO
        // =========================

        if (seo) {

            const [existingSeo] =
                await db.query(
                    `
                    SELECT
                        id
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

            if (
                existingSeo.length
            ) {

                await db.query(
                    `
                    UPDATE
                        tags_event_invitation_seo
                    SET

                        meta_title = ?,

                        meta_description = ?,

                        og_title = ?,

                        og_description = ?,

                        og_image = ?,

                        updated_at = NOW()

                    WHERE
                        invitation_id = ?
                    `,
                    [

                        seo.meta_title || null,
                        seo.meta_description || null,

                        seo.og_title || null,
                        seo.og_description || null,
                        seo.og_image || null,

                        invitation_id

                    ]
                );

            } else {

                await db.query(
                    `
                    INSERT INTO
                    tags_event_invitation_seo
                    (

                        invitation_id,

                        meta_title,
                        meta_description,

                        og_title,
                        og_description,
                        og_image,

                        created_at,
                        updated_at

                    )

                    VALUES
                    (

                        ?,

                        ?,
                        ?,

                        ?,
                        ?,
                        ?,

                        NOW(),
                        NOW()

                    )
                    `,
                    [

                        invitation_id,

                        seo.meta_title || null,
                        seo.meta_description || null,

                        seo.og_title || null,
                        seo.og_description || null,
                        seo.og_image || null

                    ]
                );
            }
        }
        // =========================
        // STYLES
        // Guardar estilos visuales en
        // tags_event_invitations.settings_json
        // =========================

        if (styles) {

            const [settingsRows] =
                await db.query(
                    `
            SELECT
                settings_json
            FROM
                tags_event_invitations
            WHERE
                id = ?
            LIMIT 1
            `,
                    [
                        invitation_id
                    ]
                );

            let settings = {};

            try {

                settings =
                    settingsRows[0]?.settings_json
                        ? JSON.parse(
                            settingsRows[0].settings_json
                        )
                        : {};

            } catch (err) {

                settings = {};
            }

            settings.styles =
                styles;

            settings.header =
                header || {};

            await db.query(
                `
                UPDATE
                    tags_event_invitations
                SET
                    settings_json = ?,
                    updated_at = NOW()
                WHERE
                    id = ?
                `,
                [
                    JSON.stringify(settings),
                    invitation_id
                ]
            );
        }

        // =========================
        // BLOCKS
        // =========================

        if (
            Array.isArray(blocks)
        ) {

            for (
                const block
                of blocks
            ) {

                await db.query(
                    `
                    UPDATE
                        tags_event_invitation_blocks
                    SET

                        title = ?,

                        position = ?,

                        config_json = ?,

                        updated_at = NOW()

                    WHERE
                        id = ?
                        AND invitation_id = ?
                    `,
                    [

                        block.title || null,

                        block.position,

                        JSON.stringify(
                            block.config_json || {}
                        ),

                        block.id,

                        invitation_id

                    ]
                );
            }
        }

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                invitation.event_id,

            actionCode:
                "invitations.builder.save",

            entityType:
                "invitation",

            entityId:
                invitation_id,

            description:
                "Builder actualizado",

            metadata: {

                invitation_id,

                theme_id,

                blocks:
                    blocks?.length || 0

            },

            req

        });

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true

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