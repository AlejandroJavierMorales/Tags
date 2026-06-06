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

import { sendMail }
    from "@/app/lib/sendMail";

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

        const {
            invitation_id,
            guest_ids,
            mode = "all"
        } = body;

        if (
            !invitation_id
            &&
            (
                !guest_ids
                ||
                !guest_ids.length
            )
        ) {

            return Response.json(
                {
                    error:
                        "invitation_id o guest_ids requerido"
                },
                { status: 400 }
            );
        }

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
                    "attendees.send"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para enviar invitaciones"
                    },
                    { status: 403 }
                );
            }
        }

        let query = "";
        let params = [];

        if (invitation_id) {

            query = `
                SELECT
                    g.*,

                    a.id AS attendee_id,
                    a.name AS attendee_name,
                    a.email AS attendee_email,
                    a.invitation_status AS attendee_invitation_status,

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
                    g.invitation_id = ?
            `;

            params = [
                invitation_id
            ];

            if (mode === "pending") {

                query += `
                    AND (
                        a.invitation_status IS NULL
                        OR a.invitation_status = 'not_sent'
                        OR a.invitation_status = 'failed'
                    )
                `;
            }

            if (mode === "not_responded") {

                query += `
                    AND (
                        g.rsvp_status IS NULL
                        OR g.rsvp_status = 'pending'
                    )
                `;
            }

            if (mode === "confirmed") {

                query += `
                    AND g.rsvp_status = 'confirmed'
                `;
            }

        } else {

            query = `
                SELECT
                    g.*,

                    a.id AS attendee_id,
                    a.name AS attendee_name,
                    a.email AS attendee_email,
                    a.invitation_status AS attendee_invitation_status,

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
                    g.id IN (?)
            `;

            params = [
                guest_ids
            ];
        }

        const [guests] =
            await db.query(
                query,
                params
            );

        if (!guests.length) {

            return Response.json(
                {
                    error:
                        "No se encontraron invitados para enviar"
                },
                { status: 404 }
            );
        }

        if (session.role !== "admin") {

            const invalid =
                guests.find(
                    guest =>
                        Number(guest.business_id) !==
                        Number(session.businessId)
                );

            if (invalid) {

                return Response.json(
                    { error: "Sin permisos" },
                    { status: 403 }
                );
            }
        }

        const isDev =
            process.env.NODE_ENV === "development";

        const baseUrl =
            isDev
                ? "http://localhost:3000"
                : process.env.NEXT_PUBLIC_APP_URL;

        let sent = 0;
        let failed = 0;

        const errors = [];

        for (const guest of guests) {

            try {

                if (!guest.attendee_email) {

                    failed++;

                    errors.push({
                        guest_id: guest.id,
                        attendee: guest.attendee_name,
                        error: "Sin email"
                    });

                    continue;
                }

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

                const invitationUrl =
                    `${baseUrl}/e/invite/${accessToken}`;

                const html = `
                    <div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;">
                        <h2>${guest.title}</h2>

                        <p>Hola ${guest.attendee_name}</p>

                        <p>Has sido invitado a este evento.</p>

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

                await sendMail({
                    to: guest.attendee_email,
                    subject: guest.title,
                    html
                });

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

                sent++;

            } catch (err) {

                failed++;

                errors.push({
                    guest_id: guest.id,
                    attendee: guest.attendee_name,
                    error: err.message
                });
            }
        }

        await createEventLog({

            eventId:
                guests[0].event_id,

            actionCode:
                "attendees.send",

            entityType:
                "invitation",

            entityId:
                invitation_id || null,

            description:
                `${sent} invitaciones enviadas`,

            metadata: {
                total: guests.length,
                sent,
                failed,
                mode
            },

            req
        });

        return Response.json({
            ok: true,
            mode,
            total: guests.length,
            sent,
            failed,
            errors
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    err.message
            },
            { status: 500 }
        );
    }
}