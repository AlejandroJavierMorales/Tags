export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db } from "@/app/lib/tags-db";

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

            // only event staff

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

                    "staff.create"
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
            !name
            ||
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

                LIMIT 1
                `,
                [
                    session.businessId,
                    email
                ]
            );

        if (exists.length) {

            return Response.json(
                {
                    error:
                        "Email ya registrado"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // INSERT STAFF
        // =========================

        const [result] =
            await db.query(
                `
                INSERT INTO tags_events_staff (

                    business_id,

                    name,
                    email,
                    phone,

                    role,

                    permissions,

                    status,

                    created_at,
                    updated_at

                )

                VALUES (

                    ?,

                    ?, ?, ?,

                    ?,

                    ?,

                    ?,

                    NOW(),
                    NOW()

                )
                `,
                [

                    session.businessId,

                    name,
                    email,
                    phone || null,

                    role || "assistant",

                    JSON.stringify(
                        permissions || []
                    ),

                    status || "active"
                ]
            );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId: null,

            staffId:
                result.insertId,

            actionCode:
                "staff.create",

            entityType:
                "staff",

            entityId:
                result.insertId,

            description:
                `Creación de personal: ${name}`,

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

            ok: true,

            id:
                result.insertId
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