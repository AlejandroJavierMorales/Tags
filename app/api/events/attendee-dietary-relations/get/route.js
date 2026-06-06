// ============================================
// /api/e-events/attendee-dietary-relations/get/route.js
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

        const attendeeId =
            searchParams.get("attendee_id");

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
        // ATTENDEE
        // =========================

        const [attendees] =
            await db.query(
                `
                SELECT

                    a.id,
                    a.event_id,

                    e.business_id

                FROM tags_event_attendees a

                INNER JOIN tags_events e
                    ON e.id = a.event_id

                WHERE a.id = ?

                LIMIT 1
                `,
                [attendeeId]
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
                    "attendee_dietary_relations.view"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para ver restricciones del invitado"
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
        // QUERY
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    r.id,

                    r.name,
                    r.slug,

                    r.color,
                    r.icon,

                    r.is_system,

                    r.severity,

                    r.requires_kitchen_attention,

                    rel.created_at

                FROM
                tags_event_attendee_dietary_relations rel

                INNER JOIN
                tags_event_dietary_restrictions r
                    ON r.id = rel.restriction_id

                WHERE
                    rel.attendee_id = ?

                ORDER BY
                    r.name ASC
                `,
                [attendeeId]
            );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            restrictions:
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