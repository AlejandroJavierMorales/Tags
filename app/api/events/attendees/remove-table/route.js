// ========================================
// /api/events/attendees/remove-table/route.js
// ========================================
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";
import { recalculateTableSeats } from "@/app/modules/e-events/lib/recalculateTableSeats";

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

                    "tables.assign"
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

        const { attendee_id } =
            body;

        const [relations] =
            await db.query(
                `
                SELECT table_id

                FROM tags_event_attendee_tables

                WHERE attendee_id = ?
                `,
                [attendee_id]
            );

        if (!relations.length) {

            return Response.json(
                {
                    error:
                        "El invitado no tiene mesa asignada"
                },
                {
                    status: 404
                }
            );
        }

        const tableId =
            relations[0].table_id;

        await db.query(
            `
            DELETE FROM tags_event_attendee_tables

            WHERE attendee_id = ?
            `,
            [attendee_id]
        );

        await recalculateTableSeats(
            tableId
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