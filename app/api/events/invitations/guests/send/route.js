export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";

import { db }
    from "@/app/lib/tags-db";

import { createEventLog }
    from "@/app/modules/e-events/lib/createEventLog";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";
import { sendMail } from "@/app/lib/sendMail";

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
            invitation_guest_id
        } = body;

        if (!invitation_guest_id) {

            return Response.json(
                {
                    error:
                        "invitation_guest_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // GUEST
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    g.*,

                    a.id AS attendee_id,
                    a.name AS attendee_name,
                    a.email AS attendee_email,
                    a.phone AS attendee_phone,

                    i.id AS invitation_id,
                    i.title,
                    i.event_id,

                    e.business_id,
                    e.name AS event_name

                FROM
                    tags_event_invitation_guests g

                INNER JOIN
                    tags_event_attendees a
                        ON a.id = g.attendee_id

                INNER JOIN
                    tags_event_invitations i
                        ON i.id = g.invitation_id

                INNER JOIN
                    tags_events e
                        ON e.id = i.event_id

                WHERE
                    g.id = ?

                LIMIT 1
                `,
                [
                    invitation_guest_id
                ]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Invitado no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const guest =
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
                    "attendees.send"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para enviar invitaciones"
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
            guest.business_id !==
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
        // EMAIL REQUIRED
        // =========================

        if (!guest.attendee_email) {

            return Response.json(
                {
                    error:
                        "El invitado no posee email"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // TOKEN
        // =========================

        let accessToken =
            guest.access_token;

        if (!accessToken) {

            accessToken =
                crypto.randomUUID();

            await db.query(
                `
                UPDATE
                    tags_event_invitation_guests
                SET
                    access_token = ?,
                    updated_at = NOW()
                WHERE
                    id = ?
                `,
                [
                    accessToken,
                    guest.id
                ]
            );
        }

        // =========================
        // URL
        // =========================

        const isDev =
            process.env.NODE_ENV ===
            "development";

        const baseUrl =
            isDev
                ? "http://localhost:3000"
                : process.env.NEXT_PUBLIC_APP_URL;

        const invitationUrl =
            `${baseUrl}/e/invite/${accessToken}`;

        // =========================
        // EMAIL HTML
        // =========================

        const html = `
        <div
            style="
                max-width:600px;
                margin:auto;
                font-family:Arial,sans-serif;
            "
        >

            <h2>
                ${guest.title}
            </h2>

            <p>
                Hola ${guest.attendee_name}
            </p>

            <p>
                Has sido invitado a este evento.
            </p>

            <p>
                Accedé a tu invitación desde:
            </p>

            <p>
                <a
                    href="${invitationUrl}"
                    style="
                        display:inline-block;
                        padding:12px 24px;
                        background:#000;
                        color:#fff;
                        text-decoration:none;
                        border-radius:8px;
                    "
                >
                    Ver Invitación
                </a>
            </p>

        </div>
        `;

        // =========================
        // SEND
        // =========================

        await sendMail({

            to:
                guest.attendee_email,

            subject:
                guest.title,

            html
        });

        // =========================
        // ATTENDEE STATUS
        // =========================

        await db.query(
            `
            UPDATE
                tags_event_attendees
            SET
                invitation_status = 'sent',
                invite_sent_at = NOW()
            WHERE
                id = ?
            `,
            [
                guest.attendee_id
            ]
        );

        // =========================
        // INVITES LOG
        // =========================

        await db.query(
            `
            INSERT INTO
            tags_event_invites
            (

                attendee_id,

                event_id,

                channel,

                recipient,

                subject,

                sent_at,

                delivery_status,

                created_at

            )

            VALUES
            (

                ?,

                ?,

                'email',

                ?,

                ?,

                NOW(),

                'sent',

                NOW()

            )
            `,
            [

                guest.attendee_id,

                guest.event_id,

                guest.attendee_email,

                guest.title

            ]
        );

        // =========================
        // EVENT LOG
        // =========================

        await createEventLog({

            eventId:
                guest.event_id,

            actionCode:
                "attendees.send",

            entityType:
                "invitation_guest",

            entityId:
                guest.id,

            description:
                `Invitación enviada a ${guest.attendee_name}`,

            metadata: {

                invitation_id:
                    guest.invitation_id,

                attendee_id:
                    guest.attendee_id,

                email:
                    guest.attendee_email

            },

            req
        });

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            invitation_url:
                invitationUrl
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