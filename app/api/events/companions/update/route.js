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

export async function PUT(req) {

    try {

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

        const isOwner =

            session.role === "admin"
            ||
            session.role === "event_client";

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

                    "companions.update"
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

        const body =
            await req.json();

        const {

            id,

            name,
            email,
            phone,

            attendee_status,

            dietary_notes,

            relation_type

        } = body;

        if (!id || !name) {

            return Response.json(
                {
                    error:
                        "Datos incompletos"
                },
                {
                    status: 400
                }
            );
        }

        const [companions] =
            await db.query(
                `
                SELECT

                    c.id,
                    c.event_id,

                    e.business_id

                FROM
                tags_event_attendee_companions c

                INNER JOIN tags_events e
                    ON e.id = c.event_id

                WHERE
                    c.id = ?

                LIMIT 1
                `,
                [id]
            );

        if (!companions.length) {

            return Response.json(
                {
                    error:
                        "Acompañante no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const companion =
            companions[0];

        if (
            companion.business_id
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

        await db.query(
            `
            UPDATE
            tags_event_attendee_companions

            SET

                name = ?,
                email = ?,
                phone = ?,

                attendee_status = ?,

                dietary_notes = ?,

                relation_type = ?

            WHERE
                id = ?
            `,
            [

                name,
                email || null,
                phone || null,

                attendee_status || "pending",

                dietary_notes || null,

                relation_type || "guest",

                id
            ]
        );

        await createEventLog({

            eventId:
                companion.event_id,

            actionCode:
                "companions.update",

            entityType:
                "companion",

            entityId:
                id,

            description:
                `Acompañante actualizado: ${name}`,

            metadata: {

                id,
                name
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
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}