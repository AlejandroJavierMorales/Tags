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
            guest_id
        } = body;

        if (!guest_id) {

            return Response.json(
                {
                    error:
                        "guest_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // GUEST
        // =========================

        const [guests] =
            await db.query(
                `
                SELECT

                    g.*,

                    i.event_id,

                    e.business_id

                FROM tags_event_invitation_guests g

                INNER JOIN tags_event_invitations i
                    ON i.id = g.invitation_id

                INNER JOIN tags_events e
                    ON e.id = i.event_id

                WHERE g.id = ?

                LIMIT 1
                `,
                [guest_id]
            );

        if (!guests.length) {

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
            guests[0];

        // =========================
        // TOKEN REQUIRED
        // =========================

        if (!guest.access_token) {

            return Response.json(
                {
                    error:
                        "Debe generar token primero"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // PERMISSIONS
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
                    "attendees.update"
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
        // QR URL
        // =========================

        const isDev =
            process.env.NODE_ENV === "development";

        const baseUrl =
            isDev
                ? "http://localhost:3000"
                : process.env.NEXT_PUBLIC_APP_URL;

        const qrCodeUrl =
            `${baseUrl}/e/invite/${guest.access_token}`;

        // =========================
        // UPDATE
        // =========================

        await db.query(
            `
            UPDATE
                tags_event_invitation_guests

            SET

                qr_code = ?,
                updated_at = NOW()

            WHERE
                id = ?
            `,
            [
                qrCodeUrl,
                guest_id
            ]
        );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                guest.event_id,

            actionCode:
                "invitations.guests.generate_qr",

            entityType:
                "invitation_guest",

            entityId:
                guest_id,

            description:
                "QR generado",

            metadata: {

                invitation_id:
                    guest.invitation_id,

                qr_code:
                    qrCodeUrl
            },

            req
        });

        return Response.json({

            ok: true,

            qr_code:
                qrCodeUrl
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