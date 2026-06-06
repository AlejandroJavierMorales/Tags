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

                    g.id,
                    g.invitation_id,

                    g.attendee_id,
                    g.companion_id,

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
                    "invitations.guests.update"
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
        // TOKEN
        // =========================

        const accessToken =
            crypto
                .randomBytes(32)
                .toString("hex");

        // =========================
        // UPDATE
        // =========================

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
                "invitations.guests.generate_token",

            entityType:
                "invitation_guest",

            entityId:
                guest_id,

            description:
                "Token de acceso regenerado",

            metadata: {

                invitation_id:
                    guest.invitation_id,

                attendee_id:
                    guest.attendee_id,

                companion_id:
                    guest.companion_id
            },

            req
        });

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            access_token:
                accessToken

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