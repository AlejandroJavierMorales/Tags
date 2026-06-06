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
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body =
            await req.json();

        const { invitation_id } =
            body;

        if (!invitation_id) {

            return Response.json(
                { error: "invitation_id requerido" },
                { status: 400 }
            );
        }

        const [rows] =
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

        if (!rows.length) {

            return Response.json(
                { error: "Invitación no encontrada" },
                { status: 404 }
            );
        }

        const invitation =
            rows[0];

        const isOwner =
            session.role === "admin"
            ||
            session.role === "event_client";

        if (!isOwner) {

            if (session.type !== "event_staff") {

                return Response.json(
                    { error: "Sin permisos" },
                    { status: 403 }
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
                            "Sin permisos para despublicar invitaciones"
                    },
                    { status: 403 }
                );
            }
        }

        if (
            session.role !== "admin"
            &&
            invitation.business_id !== session.businessId
        ) {

            return Response.json(
                { error: "Sin permisos" },
                { status: 403 }
            );
        }

        await db.query(
            `
            UPDATE
                tags_event_invitations
            SET
                is_active = 0,
                updated_at = NOW()
            WHERE
                id = ?
            `,
            [
                invitation_id
            ]
        );

        await createEventLog({

            eventId:
                invitation.event_id,

            actionCode:
                "invitations.unpublish",

            entityType:
                "invitation",

            entityId:
                invitation_id,

            description:
                `Invitación despublicada: ${invitation.title}`,

            metadata: {
                invitation_id
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
                    err.message || "Error interno"
            },
            { status: 500 }
        );
    }
}