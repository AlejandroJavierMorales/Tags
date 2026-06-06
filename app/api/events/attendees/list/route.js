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

        const status =
            searchParams.get("status");

        const invitationStatus =
            searchParams.get(
                "invitation_status"
            );

        const tableId =
            searchParams.get("table_id");

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
            "a.event_id = ?"
        );

        values.push(eventId);

        // =========================
        // SEARCH
        // =========================

        if (search) {

            filters.push(`
                (
                    a.name LIKE ?
                    OR a.email LIKE ?
                    OR a.phone LIKE ?
                    OR q.code LIKE ?
                    OR t.name LIKE ?
                    OR tg.name LIKE ?
                )
            `);

            values.push(`%${search}%`);
            values.push(`%${search}%`);
            values.push(`%${search}%`);
            values.push(`%${search}%`);
            values.push(`%${search}%`);
            values.push(`%${search}%`);
        }

        // =========================
        // RSVP STATUS
        // =========================

        if (status) {

            filters.push(
                "a.status = ?"
            );

            values.push(status);
        }

        // =========================
        // INVITATION STATUS
        // =========================

        if (invitationStatus) {

            filters.push(
                "a.invitation_status = ?"
            );

            values.push(
                invitationStatus
            );
        }

        // =========================
        // TABLE FILTER
        // =========================

        if (tableId) {

            if (tableId === "unassigned") {

                filters.push(
                    "atr.table_id IS NULL"
                );

            } else {

                filters.push(
                    "atr.table_id = ?"
                );

                values.push(tableId);
            }
        }

        // =========================
        // QUERY
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    a.id,

                    ANY_VALUE(a.event_id)
                        AS event_id,

                    ANY_VALUE(a.qr_code_id)
                        AS qr_code_id,

                    ANY_VALUE(a.qr_token)
                        AS qr_token,

                    ANY_VALUE(atr.table_id)
                        AS table_id,

                    ANY_VALUE(atr.seats_reserved)
                        AS seats_reserved,

                    ANY_VALUE(a.name)
                        AS name,

                    ANY_VALUE(a.email)
                        AS email,

                    ANY_VALUE(a.phone)
                        AS phone,

                    ANY_VALUE(a.status)
                        AS status,

                    ANY_VALUE(a.invitation_status)
                        AS invitation_status,

                    ANY_VALUE(a.checked_in_at)
                        AS checked_in_at,

                    ANY_VALUE(a.viewed_at)
                        AS viewed_at,

                    ANY_VALUE(a.confirmed_at)
                        AS confirmed_at,

                    ANY_VALUE(a.declined_at)
                        AS declined_at,

                    ANY_VALUE(a.invite_sent_at)
                        AS invite_sent_at,

                    ANY_VALUE(a.invite_opened_at)
                        AS invite_opened_at,

                    ANY_VALUE(a.plus_ones_allowed)
                        AS plus_ones_allowed,

                    ANY_VALUE(a.plus_ones_confirmed)
                        AS plus_ones_confirmed,

                    ANY_VALUE(a.dietary_notes)
                        AS dietary_notes,

                    ANY_VALUE(a.custom_dietary_notes)
                        AS custom_dietary_notes,

                    ANY_VALUE(a.internal_notes)
                        AS internal_notes,

                    ANY_VALUE(a.created_at)
                        AS created_at,

                    ANY_VALUE(q.code)
                        AS qr_code,

                    ANY_VALUE(q.final_url)
                        AS final_url,

                    ANY_VALUE(q.status)
                        AS qr_status,

                    ANY_VALUE(e.name)
                        AS event_name,

                    ANY_VALUE(t.name)
                        AS table_name,

                    ANY_VALUE(t.capacity)
                        AS table_capacity,

                    COALESCE(

                        (
                            SELECT JSON_ARRAYAGG(

                                JSON_OBJECT(

                                    'id', c.id,
                                    'name', c.name,
                                    'email', c.email,
                                    'phone', c.phone,

                                    'attendee_status',
                                    c.attendee_status,

                                    'invitation_status',
                                    c.invitation_status,

                                    'relation_type',
                                    c.relation_type,

                                    'dietary_notes',
                                    c.dietary_notes,

                                    'checked_in_at',
                                    c.checked_in_at,

                                    'created_at',
                                    c.created_at

                                )

                            )

                            FROM tags_event_attendee_companions c

                            WHERE c.attendee_id = a.id
                        ),

                        JSON_ARRAY()

                    ) AS companions,

                    COALESCE(

                        JSON_ARRAYAGG(

                            CASE

                                WHEN tg.id IS NOT NULL

                                THEN JSON_OBJECT(

                                    'id', tg.id,
                                    'name', tg.name,
                                    'color', tg.color

                                )

                            END

                        ),

                        JSON_ARRAY()

                    ) AS attendee_tags,

                COALESCE(

                    (

                        SELECT JSON_ARRAYAGG(

                            JSON_OBJECT(

                                'id', dr.id,
                                'name', dr.name,
                                'slug', dr.slug,
                                'color', dr.color,
                                'severity', dr.severity

                            )

                        )

                        FROM tags_event_attendee_dietary_relations adr

                        INNER JOIN tags_event_dietary_restrictions dr
                            ON dr.id = adr.restriction_id

                        WHERE adr.attendee_id = a.id

                    ),

                    JSON_ARRAY()

                ) AS attendee_dietary_restrictions

                FROM tags_event_attendees a

                INNER JOIN tags_events e
                    ON e.id = a.event_id

                LEFT JOIN tags_qr_codes q
                    ON q.id = a.qr_code_id

                LEFT JOIN tags_event_attendee_tables atr
                    ON atr.attendee_id = a.id

                LEFT JOIN tags_event_tables t
                    ON t.id = atr.table_id

                LEFT JOIN tags_event_attendee_tag_relations atrr
                    ON atrr.attendee_id = a.id

                LEFT JOIN tags_events_tags tg
                    ON tg.id = atrr.tag_id

                WHERE ${filters.join(" AND ")}

                GROUP BY a.id

                ORDER BY
                    table_name ASC,
                    name ASC
                `,
                values
            );

        // =========================
        // NORMALIZE
        // =========================

        const normalizedRows =
            rows.map(row => ({

                ...row,

                attendee_tags:
                    typeof row.attendee_tags === "string"
                        ? JSON.parse(
                            row.attendee_tags
                        ).filter(Boolean)
                        : row.attendee_tags || [],

                companions:
                    typeof row.companions === "string"
                        ? JSON.parse(
                            row.companions
                        ).filter(Boolean)
                        : row.companions || [],

                attendee_dietary_restrictions:
                    typeof row.attendee_dietary_restrictions === "string"
                        ? JSON.parse(
                            row.attendee_dietary_restrictions
                        ).filter(Boolean)
                        : row.attendee_dietary_restrictions || [],

            }));

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            data: normalizedRows
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