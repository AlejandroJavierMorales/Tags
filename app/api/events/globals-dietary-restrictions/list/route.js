// ============================================
// /api/events/global-dietary-restrictions/list/route.js
// ============================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

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
        // ONLY ADMINS / OWNERS
        // =========================

        const allowed =

            session.role === "admin"
            ||
            session.role === "event_client";

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

        // =========================
        // PARAMS
        // =========================

        const { searchParams } =
            new URL(req.url);

        const search =
            searchParams.get("search");

        const severity =
            searchParams.get("severity");

        // =========================
        // FILTERS
        // =========================

        const conditions = [];
        const values = [];

        // =========================
        // ONLY SYSTEM RESTRICTIONS
        // =========================

        conditions.push(`
            r.is_system = 1
        `);

        conditions.push(`
            r.event_id IS NULL
        `);

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
        // WHERE
        // =========================

        const where =
            conditions.length
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        // =========================
        // QUERY
        // =========================

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

                    FIELD(
                        r.severity,
                        'critical',
                        'allergy',
                        'preference'
                    ),

                    r.name ASC

                `
                ,
                values
            );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            data: rows
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