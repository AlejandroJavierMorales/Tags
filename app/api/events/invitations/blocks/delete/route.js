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

// ============================================
// POST
// ============================================

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
            id
        } = body;

        if (!id) {

            return Response.json(
                {
                    error:
                        "id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // ============================================
        // BLOCK
        // ============================================

        const [rows] =
            await db.query(
                `
                SELECT

                    b.*,

                    i.event_id,

                    e.business_id

                FROM tags_event_invitation_blocks b

                INNER JOIN tags_event_invitations i
                    ON i.id = b.invitation_id

                INNER JOIN tags_events e
                    ON e.id = i.event_id

                WHERE b.id = ?
                LIMIT 1
                `,
                [id]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Bloque no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const block =
            rows[0];

        // ============================================
        // PERMISSIONS
        // ============================================

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
                    "invitations.delete"
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

        // ============================================
        // SECURITY
        // ============================================

        if (
            session.role !== "admin"
            &&
            block.business_id !==
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

        // ============================================
        // DELETE
        // ============================================

        await db.query(
            `
            DELETE FROM
            tags_event_invitation_blocks
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        // ============================================
        // LOG
        // ============================================

        await createEventLog({

            eventId:
                block.event_id,

            actionCode:
                "invitations.blocks.delete",

            entityType:
                "invitation_block",

            entityId:
                id,

            description:
                `Bloque eliminado (${block.type})`,

            metadata: {

                block_id:
                    id,

                type:
                    block.type

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