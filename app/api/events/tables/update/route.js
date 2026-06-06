// ========================================
// /api/events/tables/update/route.js
// ========================================
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

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

                    "tables.update"
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
            description,
            capacity,
            table_type

        } = body;

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
                    t.*,
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

        const table =
            rows[0];

        if (
            table.business_id
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

        if (
            Number(capacity)
            <
            Number(table.seats_reserved)
        ) {

            return Response.json(
                {
                    error:
                        "La capacidad no puede ser menor a los lugares ocupados"
                },
                {
                    status: 400
                }
            );
        }

        await db.query(
            `
            UPDATE tags_event_tables

            SET

                name = ?,
                description = ?,
                capacity = ?,
                table_type = ?

            WHERE id = ?
            `,
            [

                name?.trim(),

                description || null,

                Number(capacity),

                table_type || "general",

                id
            ]
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