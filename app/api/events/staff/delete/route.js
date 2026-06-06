export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { createEventLog } from "@/app/modules/e-events/lib/createEventLog";
import { getEventSession } from "@/app/modules/e-events/lib/geEventSession";
import { staffHasPermission } from "@/app/modules/e-events/lib/staffHasPermission";


export async function DELETE(req) {

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

                    "staff.delete"
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
        // BODY
        // =========================

        const body =
            await req.json();

        const {
            id
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

        // =========================
        // STAFF
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT *

                FROM tags_events_staff

                WHERE
                    id = ?
                AND
                    business_id = ?

                LIMIT 1
                `,
                [
                    id,
                    session.businessId
                ]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Personal no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const staff =
            rows[0];

        // =========================
        // DELETE ASSIGNMENTS
        // =========================

        await db.query(
            `
            DELETE FROM
                tags_events_event_staff

            WHERE staff_id = ?
            `,
            [id]
        );

        // =========================
        // DELETE STAFF
        // =========================

        await db.query(
            `
            DELETE FROM
                tags_events_staff

            WHERE id = ?
            `,
            [id]
        );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId: null,

            staffId: id,

            actionCode:
                "staff.deleted",

            entityType:
                "staff",

            entityId:
                id,

            description:
                `Personal eliminado: ${staff.name}`,

            metadata: {

                email:
                    staff.email,

                role:
                    staff.role
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
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}