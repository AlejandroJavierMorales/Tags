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

                    "attendees.view"
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

        const eventId =
            searchParams.get("event_id");

        const search =
            searchParams.get("search");

        const tableType =
            searchParams.get("table_type");

        // =========================
        // VALIDATION
        // =========================

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
        // FILTERS
        // =========================

        const filters = [];
        const values = [];

        filters.push(
            "t.event_id = ?"
        );

        values.push(eventId);

        // =========================
        // SEARCH
        // =========================

        if (search) {

            filters.push(`
                (
                    t.name LIKE ?
                    OR t.description LIKE ?
                )
            `);

            values.push(`%${search}%`);
            values.push(`%${search}%`);
        }

        // =========================
        // TABLE TYPE
        // =========================

        if (tableType) {

            filters.push(
                "t.table_type = ?"
            );

            values.push(tableType);
        }

        // =========================
        // QUERY
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    t.id,
                    t.event_id,

                    t.name,
                    t.description,

                    t.capacity,
                    t.table_type,

                    t.created_at,

                    COUNT(DISTINCT atr.attendee_id)
                        AS attendees_count,

                    COALESCE(
                        SUM(
                            atr.seats_reserved
                        ),
                        0
                    ) AS seats_reserved

                FROM tags_event_tables t

                LEFT JOIN tags_event_attendee_tables atr
                    ON atr.table_id = t.id

                LEFT JOIN tags_event_attendees a
                    ON a.id = atr.attendee_id

                WHERE ${filters.join(" AND ")}

                GROUP BY t.id

                ORDER BY t.id DESC
                `,
                values
            );

        // =========================
        // ATTENDEES
        // =========================

        const tableIds =
            rows.map(r => r.id);

        let attendeesRows = [];

        if (tableIds.length) {

            const placeholders =
                tableIds
                    .map(() => "?")
                    .join(",");

            const [attendees] =
                await db.query(
                    `
                    SELECT

                        atr.table_id,

                        a.id,
                        a.name,
                        a.email,
                        a.phone,

                        atr.seats_reserved

                    FROM tags_event_attendee_tables atr

                    INNER JOIN tags_event_attendees a
                        ON a.id = atr.attendee_id

                    WHERE atr.table_id IN (${placeholders})

                    ORDER BY a.name ASC
                    `,
                    tableIds
                );

            attendeesRows =
                attendees;
        }

        // =========================
        // FORMAT
        // =========================

        const data =
            rows.map(table => {

                const attendees =
                    attendeesRows.filter(
                        a =>
                            a.table_id === table.id
                    );

                const reserved =
                    Number(
                        table.seats_reserved || 0
                    );

                const capacity =
                    Number(
                        table.capacity || 0
                    );

                return {

                    ...table,

                    attendees,

                    seats_reserved:
                        reserved,

                    available_seats:
                        Math.max(
                            capacity - reserved,
                            0
                        )
                };
            });

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            data
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