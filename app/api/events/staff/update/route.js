export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db } from "@/app/lib/tags-db";

import { createEventLog }
    from "@/app/modules/e-events/lib/createEventLog";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

export async function PUT(req) {

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

                    "staff.update"
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

            id,

            name,
            email,
            phone,

            role,

            permissions,

            status

        } = body;

        // =========================
        // VALIDATION
        // =========================

        if (
            !id ||
            !name ||
            !email
        ) {

            return Response.json(
                {
                    error:
                        "Datos incompletos"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // STAFF
        // =========================

        const [staffRows] =
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

        if (!staffRows.length) {

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
            staffRows[0];

        // =========================
        // DUPLICATED EMAIL
        // =========================

        const [exists] =
            await db.query(
                `
                SELECT id

                FROM tags_events_staff

                WHERE

                    business_id = ?
                AND
                    email = ?
                AND
                    id != ?

                LIMIT 1
                `,
                [
                    session.businessId,
                    email,
                    id
                ]
            );

        if (exists.length) {

            return Response.json(
                {
                    error:
                        "El email ya existe"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // UPDATE
        // =========================

        await db.query(
            `
            UPDATE tags_events_staff

            SET

                name = ?,
                email = ?,
                phone = ?,

                role = ?,

                permissions = ?,

                status = ?,

                updated_at = NOW()

            WHERE id = ?
            `,
            [

                name,
                email,
                phone || null,

                role || "assistant",

                JSON.stringify(
                    permissions || []
                ),

                status || "active",

                id
            ]
        );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId: null,

            staffId: id,

            actionCode:
                "staff.updated",

            entityType:
                "staff",

            entityId:
                id,

            description:
                `Personal actualizado: ${name}`,

            metadata: {

                email,

                role,

                permissions
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