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
import { deleteFile } from "@/app/modules/files/lib/deleteFile";



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
            media_id
        } = body;

        if (!media_id) {

            return Response.json(
                {
                    error:
                        "media_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // MEDIA
        // =========================

        const [mediaRows] =
            await db.query(
                `
                SELECT

                    m.*,

                    i.event_id,

                    e.business_id

                FROM
                    tags_event_invitation_media m

                INNER JOIN
                    tags_event_invitations i
                        ON i.id = m.invitation_id

                INNER JOIN
                    tags_events e
                        ON e.id = i.event_id

                WHERE
                    m.id = ?

                LIMIT 1
                `,
                [media_id]
            );

        if (!mediaRows.length) {

            return Response.json(
                {
                    error:
                        "Media no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const media =
            mediaRows[0];

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
                    "invitations.media.delete"
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
            media.business_id !==
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
        // STORAGE
        // =========================

        if (
            media.storage_path
        ) {

            try {

                await deleteFile(
                    media.storage_path
                );

            } catch (err) {

                console.log(
                    "Error deleting file:",
                    err.message
                );
            }
        }

        // =========================
        // DELETE DB
        // =========================

        await db.query(
            `
            DELETE FROM
                tags_event_invitation_media
            WHERE
                id = ?
            `,
            [media_id]
        );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                media.event_id,

            actionCode:
                "invitations.media.delete",

            entityType:
                "invitation_media",

            entityId:
                media.id,

            description:
                "Media eliminada",

            metadata: {

                invitation_id:
                    media.invitation_id,

                file_url:
                    media.file_url,

                storage_path:
                    media.storage_path

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