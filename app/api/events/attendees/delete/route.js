export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

import { createEventLog }
    from "@/app/modules/e-events/lib/createEventLog";

export async function DELETE(req) {

    try {

        // =========================
        // SESSION
        // =========================

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

                    "attendees.delete"
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
        // BODY
        // =========================

        const body =
            await req.json();

        const {
            id
        } = body;

        if (!id) {

            return Response.json(
                {
                    error:
                        "ID requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // ATTENDEE
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT
                    a.*,
                    e.business_id

                FROM tags_event_attendees a

                INNER JOIN tags_events e
                    ON e.id = a.event_id

                WHERE a.id = ?

                LIMIT 1
                `,
                [id]
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

        const attendee =
            rows[0];

        // =========================
        // VALIDATE OWNER
        // =========================

        if (
            attendee.business_id !==
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
        // DELETE ATTENDEE
        // =========================

        await db.query(
            `
            DELETE FROM tags_event_attendees

            WHERE id = ?
            `,
            [id]
        );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                attendee.event_id,

            staffId:
                session.staffId || null,

            actionCode:
                "attendees.delete",

            entityType:
                "attendee",

            entityId:
                id,

            description:
                `Invitado eliminado: ${attendee.name}`,

            metadata: {

                attendee_id:
                    id,

                attendee_name:
                    attendee.name,

                attendee_email:
                    attendee.email
            },

            req
        });

        // =========================
        // RESPONSE
        // =========================

        return Response.json({
            ok: true
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