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

            invitation_id,

            file_url,
            storage_path,

            mime_type,
            size_bytes,

            width,
            height,

            alt_text

        } = body;

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

        if (!file_url) {

            return Response.json(
                {
                    error:
                        "file_url requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!storage_path) {

            return Response.json(
                {
                    error:
                        "storage_path requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!mime_type) {

            return Response.json(
                {
                    error:
                        "mime_type requerido"
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
                    "invitations.media.create"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para subir media"
                    },
                    {
                        status: 403
                    }
                );
            }
        }

        // =========================
        // BUSINESS SECURITY
        // =========================

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
        // TYPE
        // =========================

        let type = "image";

        if (
            mime_type.startsWith(
                "video"
            )
        ) {

            type = "video";
        }

        if (
            mime_type.startsWith(
                "audio"
            )
        ) {

            type = "audio";
        }

        // =========================
        // POSITION
        // =========================

        const [positions] =
            await db.query(
                `
                SELECT

                    COALESCE(
                        MAX(position),
                        0
                    ) + 1
                    AS nextPosition

                FROM
                    tags_event_invitation_media

                WHERE
                    invitation_id = ?
                `,
                [invitation_id]
            );

        const position =
            positions[0]
                ?.nextPosition || 1;

        // =========================
        // INSERT
        // =========================

        const [result] =
            await db.query(
                `
                INSERT INTO
                tags_event_invitation_media
                (

                    invitation_id,

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

                )

                VALUES
                (

                    ?,

                    ?,

                    ?,

                    ?,

                    ?,

                    ?,
                    ?,

                    ?,
                    ?,

                    ?,

                    NOW()

                )
                `,
                [

                    invitation_id,

                    type,

                    file_url,

                    position,

                    alt_text || null,

                    mime_type,

                    size_bytes || null,

                    width || null,
                    height || null,

                    storage_path

                ]
            );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                invitation.event_id,

            actionCode:
                "invitations.media.upload",

            entityType:
                "invitation_media",

            entityId:
                result.insertId,

            description:
                `Media agregada (${type})`,

            metadata: {

                invitation_id,

                type,

                file_url,

                storage_path,

                mime_type,

                size_bytes,

                width,

                height

            },

            req

        });

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            id:
                result.insertId

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