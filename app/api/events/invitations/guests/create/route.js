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

            invitation_id,
            attendee_id,

            personalized_message,
            max_companions

        } = body;

        // =========================
        // VALIDATION
        // =========================

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

        if (!attendee_id) {

            return Response.json(
                {
                    error:
                        "attendee_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // INVITATION
        // =========================

        const [invitations] =
            await db.query(
                `
                SELECT

                    i.id,
                    i.event_id,

                    e.business_id

                FROM
                    tags_event_invitations i

                INNER JOIN tags_events e
                    ON e.id = i.event_id

                WHERE i.id = ?

                LIMIT 1
                `,
                [invitation_id]
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
                    "attendees.create"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para crear invitados"
                    },
                    {
                        status: 403
                    }
                );
            }
        }

        // =========================
        // BUSINESS SECURITY
        // =========================

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

        // =========================
        // ATTENDEE
        // =========================

        const [attendees] =
            await db.query(
                `
                SELECT
                    id,
                    event_id,
                    name,
                    plus_ones_allowed
                FROM
                    tags_event_attendees
                WHERE
                    id = ?
                LIMIT 1
                `,
                [attendee_id]
            );

        if (!attendees.length) {

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

        const attendee =
            attendees[0];

        if (
            Number(
                attendee.event_id
            ) !==
            Number(
                invitation.event_id
            )
        ) {

            return Response.json(
                {
                    error:
                        "El invitado no pertenece al evento"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // DUPLICATE
        // =========================

        const [duplicates] =
            await db.query(
                `
                SELECT
                    id
                FROM
                    tags_event_invitation_guests
                WHERE
                    invitation_id = ?
                    AND attendee_id = ?
                LIMIT 1
                `,
                [
                    invitation_id,
                    attendee_id
                ]
            );

        if (
            duplicates.length
        ) {

            return Response.json(
                {
                    error:
                        "El invitado ya está asociado a esta invitación"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // TOKEN
        // =========================

        const access_token =
            crypto
                .randomBytes(32)
                .toString("hex");

        // =========================
        // INSERT
        // =========================

        const [result] =
            await db.query(
                `
                INSERT INTO
                tags_event_invitation_guests
                (

                    invitation_id,

                    attendee_id,

                    access_token,

                    personalized_message,

                    max_companions,

                    rsvp_status,

                    created_at

                )

                VALUES
                (

                    ?,

                    ?,

                    ?,

                    ?,

                    ?,

                    'pending',

                    NOW()

                )
                `,
                [

                    invitation_id,

                    attendee_id,

                    access_token,

                    personalized_message || null,

                    max_companions ??
                    attendee.plus_ones_allowed ??
                    0
                ]
            );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                invitation.event_id,

            actionCode:
                "invitations.guests.create",

            entityType:
                "invitation_guest",

            entityId:
                result.insertId,

            description:
                `Invitado agregado a invitación: ${attendee.name}`,

            metadata: {

                invitation_id,

                attendee_id,

                attendee_name:
                    attendee.name

            },

            req
        });

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            id:
                result.insertId,

            access_token

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