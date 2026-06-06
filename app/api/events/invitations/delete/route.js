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

        // ============================================
        // SESSION
        // ============================================

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

        // ============================================
        // BODY
        // ============================================

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
        // INVITATION
        // ============================================

        const [rows] =
            await db.query(
                `
                SELECT

                    i.*,

                    e.business_id

                FROM tags_event_invitations i

                INNER JOIN tags_events e
                    ON e.id = i.event_id

                WHERE i.id = ?
                LIMIT 1
                `,
                [id]
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

        // ============================================
        // STAFF PERMISSIONS
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
                            "Sin permisos para borrar invitaciones"
                    },
                    {
                        status: 403
                    }
                );
            }
        }

        // ============================================
        // BUSINESS SECURITY
        // ============================================

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

        // ============================================
        // DELETE RELATIONS
        // ============================================

        await db.query(
            `
            DELETE FROM
            tags_event_invitation_blocks
            WHERE invitation_id = ?
            `,
            [id]
        );

        await db.query(
            `
            DELETE FROM
            tags_event_invitation_guests
            WHERE invitation_id = ?
            `,
            [id]
        );

        await db.query(
            `
            DELETE FROM
            tags_event_invitation_media
            WHERE invitation_id = ?
            `,
            [id]
        );

        await db.query(
            `
            DELETE FROM
            tags_event_invitation_custom_styles
            WHERE invitation_id = ?
            `,
            [id]
        );

        await db.query(
            `
            DELETE FROM
            tags_event_invitation_seo
            WHERE invitation_id = ?
            `,
            [id]
        );

        await db.query(
            `
            DELETE FROM
            tags_event_invitation_access_logs
            WHERE invitation_id = ?
            `,
            [id]
        );

        await db.query(
            `
            DELETE FROM
            tags_event_invitation_analytics
            WHERE invitation_id = ?
            `,
            [id]
        );

        // ============================================
        // DELETE INVITATION
        // ============================================

        await db.query(
            `
            DELETE FROM
            tags_event_invitations
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
                invitation.event_id,

            actionCode:
                "invitations.delete",

            entityType:
                "invitation",

            entityId:
                id,

            description:
                `Invitación eliminada: ${invitation.title}`,

            metadata: {

                invitation_id:
                    id,

                title:
                    invitation.title

            },

            req
        });

        // ============================================
        // RESPONSE
        // ============================================

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