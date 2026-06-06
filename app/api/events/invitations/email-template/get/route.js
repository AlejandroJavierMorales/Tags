export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

function getDefaultTemplate(invitation) {

    const title =
        invitation?.title || "Invitación";

    return {

        sender_name:
            "Tags Eventos",

        initial_subject:
            title,

        initial_message:
            "Queremos compartir contigo nuestra invitación. Ingresá al enlace para ver todos los detalles y confirmar tu asistencia.",

        reminder_subject:
            `Recordatorio - ${title}`,

        reminder_message:
            "Todavía no registraste tu respuesta. Te agradeceríamos que confirmes tu asistencia desde el enlace de la invitación.",

        confirmed_subject:
            `Nos vemos pronto - ${title}`,

        confirmed_message:
            "Gracias por confirmar tu asistencia. Te esperamos para compartir este evento."

    };
}

export async function GET(req) {

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

        const { searchParams } =
            new URL(req.url);

        const invitation_id =
            searchParams.get(
                "invitation_id"
            );

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
                    "invitations.view"
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

        const [templates] =
            await db.query(
                `
                SELECT
                    *
                FROM
                    tags_event_invitation_email_templates
                WHERE
                    invitation_id = ?
                LIMIT 1
                `,
                [
                    invitation_id
                ]
            );

        const defaults =
            getDefaultTemplate(
                invitation
            );

        return Response.json({

            ok: true,

            invitation,

            template:
                templates[0]
                    ? {
                        ...defaults,
                        ...templates[0]
                    }
                    : defaults
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