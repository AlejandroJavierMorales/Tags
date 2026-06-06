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

import { sendMail }
    from "@/app/lib/sendMail";


function getTemplateByMode(
    template,
    invitation,
    mode
) {

    const title =
        invitation?.title || "Invitación";

    if (mode === "reminder") {

        return {
            subject:
                template?.reminder_subject ||
                `Recordatorio - ${title}`,

            message:
                template?.reminder_message ||
                "Todavía no registraste tu respuesta. Te agradeceríamos que confirmes tu asistencia desde el enlace de la invitación."
        };
    }

    if (mode === "confirmed") {

        return {
            subject:
                template?.confirmed_subject ||
                `Nos vemos pronto - ${title}`,

            message:
                template?.confirmed_message ||
                "Gracias por confirmar tu asistencia. Te esperamos para compartir este evento."
        };
    }

    return {
        subject:
            template?.initial_subject ||
            title,

        message:
            template?.initial_message ||
            "Queremos compartir contigo nuestra invitación. Ingresá al enlace para ver todos los detalles y confirmar tu asistencia."
    };
}

function buildEmailHtml({
    subject,
    message,
    invitationUrl,
    senderName
}) {

    return `
    <div
        style="
            max-width:620px;
            margin:auto;
            font-family:Arial,sans-serif;
            background:#ffffff;
            color:#111827;
            border:1px solid #e5e7eb;
            border-radius:18px;
            overflow:hidden;
        "
    >
        <div
            style="
                background:#111827;
                color:#ffffff;
                padding:22px;
            "
        >
            <h2
                style="
                    margin:0;
                    font-size:22px;
                "
            >
                ${subject}
            </h2>
        </div>

        <div
            style="
                padding:24px;
            "
        >
            <p>
                Hola Andrea,
            </p>

            <p
                style="
                    white-space:pre-line;
                    line-height:1.55;
                "
            >
                ${message}
            </p>

            <p
                style="
                    margin-top:24px;
                "
            >
                <a
                    href="${invitationUrl}"
                    style="
                        display:inline-block;
                        padding:12px 24px;
                        background:#111827;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:10px;
                        font-weight:bold;
                    "
                >
                    Ver invitación
                </a>
            </p>

            <p
                style="
                    margin-top:28px;
                    color:#6b7280;
                    font-size:13px;
                "
            >
                Este es un email de prueba generado por ${senderName || "Tags Eventos"}.
            </p>
        </div>
    </div>
    `;
}

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
            mode = "initial",
            test_email
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

        if (!test_email) {

            return Response.json(
                {
                    error:
                        "test_email requerido"
                },
                {
                    status: 400
                }
            );
        }
        if (
            !String(test_email).includes("@")
        ) {

            return Response.json(
                {
                    error:
                        "Email inválido"
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
                    e.business_id,
                    e.name AS event_name
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
                    "attendees.send"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para enviar prueba"
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

        const template =
            templates[0] || {};

        const selected =
            getTemplateByMode(
                template,
                invitation,
                mode
            );

        const isDev =
            process.env.NODE_ENV ===
            "development";

        const baseUrl =
            isDev
                ? "http://localhost:3000"
                : process.env.NEXT_PUBLIC_APP_URL;

        const invitationUrl =
            `${baseUrl}/e/invite/test-preview`;

        const html =
            buildEmailHtml({
                subject:
                    selected.subject,

                message:
                    selected.message,

                invitationUrl,

                senderName:
                    template.sender_name
            });

        const mailResult =
            await sendMail({
                to:
                    test_email,

                subject:
                    `[PRUEBA] ${selected.subject}`,

                html
            });

        console.log(
            "MAILGUN TEST RESULT:",
            JSON.stringify(
                mailResult,
                null,
                2
            )
        );

        if (!mailResult.ok) {

            return Response.json(
                {
                    error:
                        mailResult.error ||
                        "Mailgun no pudo enviar el email"
                },
                {
                    status: 500
                }
            );
        }

        await createEventLog({

            eventId:
                invitation.event_id,

            actionCode:
                "invitations.email_test.send",

            entityType:
                "invitation",

            entityId:
                invitation_id,

            description:
                `Email de prueba enviado a ${test_email}`,

            metadata: {
                invitation_id,
                test_email:
                    test_email,
                mode
            },

            req
        });

        return Response.json({

            ok: true,

            test_email:
                test_email,

            mode,

            subject:
                selected.subject
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