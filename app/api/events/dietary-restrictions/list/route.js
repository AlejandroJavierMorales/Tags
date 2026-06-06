// ============================================
// /api/e-events/dietary-restrictions/list/route.js
// ============================================

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
        // PARAMS
        // =========================

        const { searchParams } =
            new URL(req.url);

        const eventId =
            searchParams.get("event_id");

        const search =
            searchParams.get("search");

        const severity =
            searchParams.get("severity");

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
        // EVENT
        // =========================

        const [events] =
            await db.query(
                `
                SELECT
                    id,
                    business_id
                FROM tags_events
                WHERE id = ?
                LIMIT 1
                `,
                [eventId]
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

        const event =
            events[0];

        // =========================
        // BUSINESS SECURITY
        // =========================

        if (
            session.role !== "admin"
            &&
            event.business_id !==
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
        // STAFF PERMISSION
        // =========================

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
                    "dietary_restrictions.view"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para ver restricciones"
                    },
                    {
                        status: 403
                    }
                );
            }
        }

        // =========================
        // FILTERS
        // =========================

        const conditions = [];
        const values = [];

        // =========================
        // HYBRID CATALOG
        // =========================

        conditions.push(`
            (
                r.event_id = ?
            )

            OR

            (
                r.event_id IS NULL
                AND r.is_system = 1
            )
        `);

        values.push(eventId);

        // =========================
        // SEARCH
        // =========================

        if (search) {

            conditions.push(`
                (
                    r.name LIKE ?
                    OR
                    r.slug LIKE ?
                )
            `);

            values.push(
                `%${search}%`,
                `%${search}%`
            );
        }

        // =========================
        // SEVERITY
        // =========================

        if (severity) {

            conditions.push(`
                r.severity = ?
            `);

            values.push(severity);
        }

        // =========================
        // QUERY
        // =========================

        const where =
            conditions.length
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        const [rows] =
            await db.query(
                `
                SELECT

                    r.id,
                    r.event_id,

                    r.name,
                    r.slug,

                    r.color,
                    r.icon,

                    r.is_system,

                    r.severity,

                    r.requires_kitchen_attention,

                    r.created_at,
                    r.updated_at,

                    COUNT(rel.attendee_id)
                        AS attendees_count

                FROM
                tags_event_dietary_restrictions r

                LEFT JOIN
                tags_event_attendee_dietary_relations rel
                    ON rel.restriction_id = r.id

                ${where}

                GROUP BY
                    r.id

                ORDER BY

                    r.is_system DESC,

                    FIELD(
                        r.severity,
                        'critical',
                        'allergy',
                        'preference'
                    ),

                    r.name ASC
                `,
                values
            );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            data:
                rows
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    err.message ||
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}