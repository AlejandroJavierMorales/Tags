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

        const body =
            await req.json();

        const {
            invitation_id
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
        // TEMPLATE
        // =========================

        const [templates] =
            await db.query(
                `
                SELECT
                    *
                FROM
                    tags_event_invitation_templates
                WHERE
                    id = ?
                LIMIT 1
                `,
                [
                    invitation.template_id
                ]
            );

        if (!templates.length) {

            return Response.json(
                {
                    error:
                        "Template no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const template =
            templates[0];

        let templateConfig = {};

        try {

            templateConfig =
                JSON.parse(
                    template.config_json || "{}"
                );

        } catch {

            templateConfig = {};
        }

        // =========================
        // INVITATION CONFIG
        // =========================

        await db.query(
            `
            UPDATE
                tags_event_invitations
            SET

                config_json = ?,

                updated_at = NOW()

            WHERE
                id = ?
            `,
            [

                JSON.stringify(
                    templateConfig
                ),

                invitation_id

            ]
        );

        // =========================
        // BLOCKS
        // =========================

        await db.query(
            `
            DELETE FROM
                tags_event_invitation_blocks
            WHERE
                invitation_id = ?
            `,
            [
                invitation_id
            ]
        );

        if (
            Array.isArray(
                templateConfig.default_blocks
            )
        ) {

            let position = 1;

            for (
                const blockCode
                of templateConfig.default_blocks
            ) {

                const [types] =
                    await db.query(
                        `
                        SELECT
                            id
                        FROM
                            tags_event_invitation_block_types
                        WHERE
                            code = ?
                        LIMIT 1
                        `,
                        [
                            blockCode
                        ]
                    );

                if (
                    !types.length
                ) {

                    continue;
                }

                await db.query(
                    `
                    INSERT INTO
                    tags_event_invitation_blocks
                    (

                        invitation_id,

                        block_type_id,

                        title,

                        position,

                        config_json,

                        created_at,

                        updated_at

                    )

                    VALUES
                    (

                        ?,

                        ?,

                        NULL,

                        ?,

                        '{}',

                        NOW(),

                        NOW()

                    )
                    `,
                    [

                        invitation_id,

                        types[0].id,

                        position++

                    ]
                );
            }
        }

        // =========================
        // SEO
        // =========================

        await db.query(
            `
            DELETE FROM
                tags_event_invitation_seo
            WHERE
                invitation_id = ?
            `,
            [
                invitation_id
            ]
        );

        // =========================
        // STYLES
        // =========================

        await db.query(
            `
            DELETE FROM
                tags_event_invitation_custom_styles
            WHERE
                invitation_id = ?
            `,
            [
                invitation_id
            ]
        );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                invitation.event_id,

            actionCode:
                "invitations.builder.reset",

            entityType:
                "invitation",

            entityId:
                invitation_id,

            description:
                "Builder restaurado al template original",

            metadata: {

                invitation_id,

                template_id:
                    invitation.template_id

            },

            req

        });

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            reset: true,

            template_id:
                invitation.template_id

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