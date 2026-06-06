export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { createEventLog }
    from "@/app/modules/e-events/lib/createEventLog";

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
            blocks
        } = body;

        if (
            !invitation_id
            ||
            !Array.isArray(blocks)
        ) {

            return Response.json(
                {
                    error:
                        "Datos inválidos"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // INVITATION
        // =========================

        const [rows] =
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

        if (!rows.length) {

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
            rows[0];

        // =========================
        // SECURITY
        // =========================

        const isOwner =

            session.role === "admin"
            ||
            session.role === "event_client";

        if (!isOwner) {

            if (
                session.type !== "event_staff"
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
        // UPDATE POSITIONS
        // =========================

        for (const item of blocks) {

            await db.query(
                `
                UPDATE
                    tags_event_invitation_blocks

                SET
                    position = ?

                WHERE
                    id = ?
                    AND invitation_id = ?
                `,
                [
                    item.position,
                    item.id,
                    invitation_id
                ]
            );
        }

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                invitation.event_id,

            actionCode:
                "invitations.blocks.reorder",

            entityType:
                "invitation",

            entityId:
                invitation_id,

            description:
                "Orden de bloques actualizado",

            metadata: {
                blocks
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
                    err.message ||
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}