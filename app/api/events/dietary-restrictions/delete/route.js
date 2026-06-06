// ============================================
// /api/e-events/dietary-restrictions/delete/route.js
// ============================================

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

export async function POST(req) {

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
        // BODY
        // =========================

        const body =
            await req.json();

        const { id } =
            body;

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
        // RESTRICTION
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    r.*,

                    e.business_id

                FROM
                tags_event_dietary_restrictions r

                LEFT JOIN tags_events e
                    ON e.id = r.event_id

                WHERE r.id = ?

                LIMIT 1
                `,
                [id]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Restricción no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const restriction =
            rows[0];

        // =========================
        // SYSTEM RESTRICTION
        // =========================

        if (
            restriction.is_system
        ) {

            if (
                session.role !== "admin"
            ) {

                return Response.json(
                    {
                        error:
                            "Solo administradores pueden eliminar restricciones globales"
                    },
                    {
                        status: 403
                    }
                );
            }

        } else {

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
                        "dietary_restrictions.delete"
                    );

                if (!allowed) {

                    return Response.json(
                        {
                            error:
                                "Sin permisos para eliminar restricciones"
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
                restriction.business_id !==
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
        }

        // =========================
        // CHECK USAGE
        // =========================

        const [usageRows] =
            await db.query(
                `
                SELECT COUNT(*) AS total

                FROM
                tags_event_attendee_dietary_relations

                WHERE restriction_id = ?
                `,
                [id]
            );

        const totalUsage =
            Number(
                usageRows[0]?.total || 0
            );

        if (totalUsage > 0) {

            return Response.json(
                {
                    error:
                        "La restricción está siendo utilizada por invitados"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // DELETE
        // =========================

        await db.query(
            `
            DELETE FROM
            tags_event_dietary_restrictions

            WHERE id = ?
            `,
            [id]
        );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                restriction.event_id || null,

            actionCode:
                "dietary_restrictions.delete",

            entityType:
                "dietary_restriction",

            entityId:
                id,

            description:
                `Restricción eliminada: ${restriction.name}`,

            metadata: {

                id,

                name:
                    restriction.name,

                slug:
                    restriction.slug,

                is_system:
                    restriction.is_system

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
                    err.message ||
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}