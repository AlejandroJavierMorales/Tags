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
                        error: "Sin permisos"
                    },
                    {
                        status: 403
                    }
                );
            }

            const allowed =
                await staffHasPermission(

                    session.staffId,

                    "dietary_restrictions.view"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error: "Sin permisos"
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

        const eventId =
            searchParams.get("event_id");

        if (!eventId) {

            return Response.json(
                {
                    error:
                        "event_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // VALIDATE EVENT
        // =========================

        const [events] =
            await db.query(
                `
                SELECT id

                FROM tags_events

                WHERE
                    id = ?
                AND
                    business_id = ?

                LIMIT 1
                `,
                [
                    eventId,
                    session.businessId
                ]
            );

        if (!events.length) {

            return Response.json(
                {
                    error:
                        "Evento no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        // =========================
        // REPORT QUERY
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    dr.id,
                    dr.name,
                    dr.slug,
                    dr.color,
                    dr.severity,
                    dr.requires_kitchen_attention,

                    COUNT(
                        DISTINCT adr.attendee_id
                    ) AS total_attendees,

                    COALESCE(

                        (

                            SELECT JSON_ARRAYAGG(

                                JSON_OBJECT(

                                    'id', a.id,

                                    'name', a.name,

                                    'email', a.email,

                                    'phone', a.phone,

                                    'status', a.status,

                                    'dietary_notes',
                                    a.dietary_notes,

                                    'custom_dietary_notes',
                                    a.custom_dietary_notes

                                )

                            )

                            FROM tags_event_attendee_dietary_relations adr2

                            INNER JOIN tags_event_attendees a
                                ON a.id = adr2.attendee_id

                            WHERE
                                adr2.restriction_id = dr.id
                            AND
                                a.event_id = ?

                        ),

                        JSON_ARRAY()

                    ) AS attendees

                FROM tags_event_dietary_restrictions dr

                LEFT JOIN tags_event_attendee_dietary_relations adr
                    ON adr.restriction_id = dr.id

                LEFT JOIN tags_event_attendees aa
                    ON aa.id = adr.attendee_id
                    AND aa.event_id = ?

                WHERE

                    (
                        dr.event_id = ?
                        OR dr.is_system = 1
                    )

                GROUP BY dr.id

                ORDER BY
                    total_attendees DESC,
                    dr.name ASC
                `,
                [
                    eventId,
                    eventId,
                    eventId
                ]
            );

        // =========================
        // NORMALIZE
        // =========================

        const normalized =
            rows.map(item => ({

                ...item,

                total_attendees:
                    Number(
                        item.total_attendees
                    ) || 0,

                attendees:
                    typeof item.attendees === "string"
                        ? JSON.parse(
                            item.attendees
                        ).filter(Boolean)
                        : item.attendees || []

            }));

            console.log('NORMALIZADOS ******* '+JSON.stringify(normalized,2,null))

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            data: normalized

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