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

        const event_id =
            searchParams.get("event_id");

        if (!event_id) {

            return Response.json(
                {
                    error:
                        "event_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // ============================================
        // EVENT
        // ============================================

        const [events] =
            await db.query(
                `
                SELECT
                    id,
                    business_id
                FROM tags_events
                WHERE id = ?
                LIMIT 1
                `,
                [event_id]
            );

        if (!events.length) {

            return Response.json(
                {
                    error:
                        "Evento no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const event =
            events[0];

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
            event.business_id !==
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
        // LIST
        // ============================================

        const [rows] =
            await db.query(
                `
                SELECT

                    i.*,

                    t.name AS template_name,

                    th.name AS theme_name,

                    (

                        SELECT COUNT(*)

                        FROM tags_event_invitation_guests g

                        WHERE
                            g.invitation_id = i.id

                    ) AS total_guests

                FROM tags_event_invitations i

                LEFT JOIN
                tags_event_invitation_templates t
                    ON t.id = i.template_id

                LEFT JOIN
                tags_event_invitation_themes th
                    ON th.id = i.theme_id

                WHERE i.event_id = ?

                ORDER BY i.created_at DESC
                `,
                [event_id]
            );

        // ============================================
        // RESPONSE
        // ============================================

        return Response.json({

            ok: true,

            invitations:
                rows
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