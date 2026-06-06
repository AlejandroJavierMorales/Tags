export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

// ============================================
// GET
// ============================================

export async function GET(req) {

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
        // PARAMS
        // ============================================

        const { searchParams } =
            new URL(req.url);

        const id =
            searchParams.get("id");

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

                    e.name AS event_name,
                    e.business_id,

                    t.name AS template_name,

                    th.name AS theme_name

                FROM tags_event_invitations i

                INNER JOIN tags_events e
                    ON e.id = i.event_id

                LEFT JOIN
                tags_event_invitation_templates t
                    ON t.id = i.template_id

                LEFT JOIN
                tags_event_invitation_themes th
                    ON th.id = i.theme_id

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
                    "invitations.view"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para ver invitaciones"
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
        // BLOCKS
        // ============================================

        const [blocks] =
            await db.query(
                `
                SELECT
                    *
                FROM tags_event_invitation_blocks
                WHERE
                    invitation_id = ?
                    AND is_active = 1
                ORDER BY position ASC
                `,
                [id]
            );

        // ============================================
        // RESPONSE
        // ============================================

        return Response.json({

            ok: true,

            invitation,

            blocks
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