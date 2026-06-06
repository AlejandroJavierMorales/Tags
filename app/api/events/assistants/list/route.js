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

        const session =
            await getEventSession();

        if (!session) {

            return Response.json(
                { error: "Unauthorized" },
                { status: 401 }
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
                    "attendees.view"
                );

            if (!allowed) {

                return Response.json(
                    { error: "Sin permisos" },
                    { status: 403 }
                );
            }
        }

        const { searchParams } =
            new URL(req.url);

        const eventId =
            searchParams.get("event_id");

        const search =
            searchParams.get("search");

        const status =
            searchParams.get("status");

        if (!eventId) {

            return Response.json(
                { error: "event_id requerido" },
                { status: 400 }
            );
        }

        const [events] =
            await db.query(
                `
                SELECT id, business_id
                FROM tags_events
                WHERE id = ?
                LIMIT 1
                `,
                [eventId]
            );

        if (!events.length) {

            return Response.json(
                { error: "Evento no encontrado" },
                { status: 404 }
            );
        }

        if (
            session.role !== "admin"
            &&
            events[0].business_id !== session.businessId
        ) {

            return Response.json(
                { error: "Sin permisos" },
                { status: 403 }
            );
        }

        const filters = [
            "x.event_id = ?"
        ];

        const values = [
            eventId
        ];

        if (search) {

            filters.push(`
                (
                    x.name LIKE ?
                    OR x.email LIKE ?
                    OR x.phone LIKE ?
                    OR x.owner_name LIKE ?
                    OR x.qr_token LIKE ?
                )
            `);

            values.push(`%${search}%`);
            values.push(`%${search}%`);
            values.push(`%${search}%`);
            values.push(`%${search}%`);
            values.push(`%${search}%`);
        }

        if (status) {

            filters.push(
                "x.status = ?"
            );

            values.push(status);
        }

        const [rows] =
            await db.query(
                `
                SELECT
                    *
                FROM
                (
                    SELECT
                        a.id AS id,
                        a.event_id AS event_id,
                        'attendee' AS type,

                        a.id AS attendee_id,
                        NULL AS companion_id,

                        a.name AS name,
                        a.email AS email,
                        a.phone AS phone,

                        a.name AS owner_name,
                        a.id AS owner_id,

                        a.status AS status,
                        a.invitation_status AS invitation_status,

                        a.qr_token AS qr_token,
                        a.checked_in_at AS checked_in_at,
                        a.confirmed_at AS confirmed_at,
                        a.declined_at AS declined_at,

                        a.dietary_notes AS dietary_notes,
                        a.custom_dietary_notes AS custom_dietary_notes,

                        t.name AS table_name,

                        0 AS sort_order

                    FROM
                        tags_event_attendees a

                    LEFT JOIN
                        tags_event_attendee_tables atr
                            ON atr.attendee_id = a.id

                    LEFT JOIN
                        tags_event_tables t
                            ON t.id = atr.table_id

                    WHERE
                        a.event_id = ?
                        AND a.status = 'confirmed'

                    UNION ALL

                    SELECT
                        c.id AS id,
                        c.event_id AS event_id,
                        'companion' AS type,

                        c.attendee_id AS attendee_id,
                        c.id AS companion_id,

                        c.name AS name,
                        c.email AS email,
                        c.phone AS phone,

                        a.name AS owner_name,
                        a.id AS owner_id,

                        c.attendee_status AS status,
                        c.invitation_status AS invitation_status,

                        c.qr_token AS qr_token,
                        c.checked_in_at AS checked_in_at,
                        c.confirmed_at AS confirmed_at,
                        c.declined_at AS declined_at,

                        c.dietary_notes AS dietary_notes,
                        NULL AS custom_dietary_notes,

                        t.name AS table_name,

                        1 AS sort_order

                    FROM
                        tags_event_attendee_companions c

                    INNER JOIN
                        tags_event_attendees a
                            ON a.id = c.attendee_id

                    LEFT JOIN
                        tags_event_attendee_tables atr
                            ON atr.attendee_id = a.id

                    LEFT JOIN
                        tags_event_tables t
                            ON t.id = atr.table_id

                    WHERE
                        c.event_id = ?
                        AND c.attendee_status = 'confirmed'

                ) x

                WHERE
                    ${filters.join(" AND ")}

                ORDER BY
                    x.owner_name ASC,
                    x.sort_order ASC,
                    x.name ASC
                `,
                [
                    eventId,
                    eventId,
                    ...values
                ]
            );

        return Response.json({

            ok: true,

            stats: {

                total:
                    rows.length,

                attendees:
                    rows.filter(
                        item => item.type === "attendee"
                    ).length,

                companions:
                    rows.filter(
                        item => item.type === "companion"
                    ).length,

                checked_in:
                    rows.filter(
                        item => item.checked_in_at
                    ).length
            },

            data:
                rows
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