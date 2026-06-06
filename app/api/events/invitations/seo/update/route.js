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

        const body =
            await req.json();

        const {

            invitation_id,

            meta_title,

            meta_description,

            og_image,

            noindex

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

        const [invitations] =
            await db.query(
                `
                SELECT

                    i.id,
                    i.event_id,

                    e.business_id

                FROM tags_event_invitations i

                INNER JOIN tags_events e
                    ON e.id = i.event_id

                WHERE i.id = ?

                LIMIT 1
                `,
                [invitation_id]
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

            const allowed =
                await staffHasPermission(
                    session.staffId,
                    "invitations.seo.update"
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

        await db.query(
            `
            INSERT INTO
            tags_event_invitation_seo
            (

                invitation_id,

                meta_title,

                meta_description,

                og_image,

                noindex,

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

                NOW(),

                NOW()

            )

            ON DUPLICATE KEY UPDATE

                meta_title =
                    VALUES(meta_title),

                meta_description =
                    VALUES(meta_description),

                og_image =
                    VALUES(og_image),

                noindex =
                    VALUES(noindex),

                updated_at =
                    NOW()
            `,
            [

                invitation_id,

                meta_title || null,

                meta_description || null,

                og_image || null,

                noindex ? 1 : 0

            ]
        );

        await createEventLog({

            eventId:
                invitation.event_id,

            actionCode:
                "invitations.seo.update",

            entityType:
                "invitation_seo",

            entityId:
                invitation_id,

            description:
                "SEO actualizado",

            metadata: {

                invitation_id,

                meta_title,

                noindex:
                    noindex ? 1 : 0

            },

            req
        });

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