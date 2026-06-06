// ========================================
// /api/events/tables/create/route.js
// ========================================
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

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
                    error:
                        "Unauthorized"
                },
                {
                    status: 401
                }
            );
        }

        // =========================
        // OWNER / STAFF
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

                    "tables.create"
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

            event_id,
            name,
            description,
            capacity,
            table_type

        } = body;

        // =========================
        // VALIDATION
        // =========================

        if (!event_id) {

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

        if (!name?.trim()) {

            return Response.json(
                {
                    error:
                        "Nombre requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (
            !capacity
            ||
            Number(capacity) <= 0
        ) {

            return Response.json(
                {
                    error:
                        "Capacidad inválida"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // VALIDATE EVENT
        // =========================

        const [events] =
            await db.query(
                `
                SELECT id

                FROM tags_events

                WHERE
                    id = ?
                AND
                    business_id = ?

                LIMIT 1
                `,
                [
                    event_id,
                    session.businessId
                ]
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

        // =========================
        // DUPLICATED NAME
        // =========================

        const [existing] =
            await db.query(
                `
                SELECT id

                FROM tags_event_tables

                WHERE
                    event_id = ?
                AND
                    name = ?

                LIMIT 1
                `,
                [
                    event_id,
                    name.trim()
                ]
            );

        if (existing.length) {

            return Response.json(
                {
                    error:
                        "Ya existe una mesa con ese nombre"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // INSERT
        // =========================

        const [result] =
            await db.query(
                `
                INSERT INTO tags_event_tables (

                    event_id,
                    name,
                    description,
                    capacity,
                    table_type

                )
                VALUES (?, ?, ?, ?, ?)
                `,
                [

                    event_id,

                    name.trim(),

                    description || null,

                    Number(capacity),

                    table_type || "general"
                ]
            );

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