export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

export async function GET(req) {

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
        // OWNER / ADMIN
        // =========================

        const isOwner =

            session.role === "admin"
            ||
            session.role === "event_client";

        // =========================
        // STAFF PERMISSION
        // =========================

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

                    "companions.view"
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

        // =========================
        // PARAMS
        // =========================

        const { searchParams } =
            new URL(req.url);

        const attendeeId =
            searchParams.get(
                "attendee_id"
            );

        if (!attendeeId) {

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
        // VALIDATE ATTENDEE
        // =========================

        const [attendees] =
            await db.query(
                `
                SELECT

                    a.id,
                    a.event_id,
                    a.name,
                    a.email,
                    e.business_id

                FROM tags_event_attendees a

                INNER JOIN tags_events e
                    ON e.id = a.event_id

                WHERE
                    a.id = ?

                LIMIT 1
                `,
                [
                    attendeeId
                ]
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
            attendee.business_id
            !==
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
        // QUERY
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    id,

                    attendee_id,
                    event_id,

                    qr_code_id,
                    qr_token,

                    name,
                    email,
                    phone,

                    attendee_status,

                    invitation_status,

                    viewed_at,
                    confirmed_at,
                    declined_at,

                    invite_sent_at,
                    invite_opened_at,

                    checked_in_at,

                    dietary_notes,

                    relation_type,

                    created_at

                FROM
                tags_event_attendee_companions

                WHERE
                    attendee_id = ?

                ORDER BY
                    created_at ASC
                `,
                [
                    attendeeId
                ]
            );

        return Response.json({

            ok: true,

            attendee: {

                id:
                    attendee.id,

                name:
                    attendee.name,

                email:
                    attendee.email

            },

            data: rows
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}