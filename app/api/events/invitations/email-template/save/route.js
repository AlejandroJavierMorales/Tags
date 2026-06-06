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
                    error:
                        "Unauthorized"
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
            sender_name,
            initial_subject,
            initial_message,
            reminder_subject,
            reminder_message,
            confirmed_subject,
            confirmed_message
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
                    i.title,
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

        const isOwner =
            session.role === "admin"
            ||
            session.role === "event_client";

        if (!isOwner) {

            if (session.type !== "event_staff") {

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
            Number(invitation.business_id) !==
            Number(session.businessId)
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

        await db.query(
            `
            INSERT INTO
                tags_event_invitation_email_templates
            (
                invitation_id,
                sender_name,
                initial_subject,
                initial_message,
                reminder_subject,
                reminder_message,
                confirmed_subject,
                confirmed_message,
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
                ?,
                ?,
                ?,
                NOW(),
                NOW()
            )
            ON DUPLICATE KEY UPDATE

                sender_name = VALUES(sender_name),

                initial_subject = VALUES(initial_subject),

                initial_message = VALUES(initial_message),

                reminder_subject = VALUES(reminder_subject),

                reminder_message = VALUES(reminder_message),

                confirmed_subject = VALUES(confirmed_subject),

                confirmed_message = VALUES(confirmed_message),

                updated_at = NOW()
            `,
            [
                invitation_id,

                sender_name || null,

                initial_subject || null,

                initial_message || null,

                reminder_subject || null,

                reminder_message || null,

                confirmed_subject || null,

                confirmed_message || null
            ]
        );

        await createEventLog({

            eventId:
                invitation.event_id,

            actionCode:
                "invitations.email_template.save",

            entityType:
                "invitation",

            entityId:
                invitation_id,

            description:
                `Plantilla de email actualizada: ${invitation.title}`,

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
            {
                status: 500
            }
        );
    }
}