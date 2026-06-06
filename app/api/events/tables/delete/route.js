// ========================================
// /api/events/tables/delete/route.js
// ========================================
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

export async function DELETE(req) {

    try {

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

                    "tables.delete"
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

        const [rows] =
            await db.query(
                `
                SELECT
                    t.id,
                    e.business_id

                FROM tags_event_tables t

                INNER JOIN tags_events e
                    ON e.id = t.event_id

                WHERE t.id = ?

                LIMIT 1
                `,
                [id]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Mesa no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        if (
            rows[0].business_id
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

        const [relations] =
            await db.query(
                `
                SELECT COUNT(*) AS total

                FROM tags_event_attendee_tables

                WHERE table_id = ?
                `,
                [id]
            );

        if (
            relations[0].total > 0
        ) {

            return Response.json(
                {
                    error:
                        "La mesa tiene invitados asignados"
                },
                {
                    status: 400
                }
            );
        }

        await db.query(
            `
            DELETE FROM tags_event_tables
            WHERE id = ?
            `,
            [id]
        );

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