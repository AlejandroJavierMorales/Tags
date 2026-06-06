// ============================================
// /api/e-events/dietary-restrictions/create/route.js
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

function createSlug(text = "") {

    return text
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

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

        const {

            event_id,

            name,

            color,
            icon,

            severity,

            requires_kitchen_attention,

            is_system

        } = body;

        // =========================
        // VALIDATION
        // =========================

        if (!name) {

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

        // =========================
        // SYSTEM RESTRICTION
        // ONLY PLATFORM ADMIN
        // =========================

        if (is_system) {

            if (
                session.role !== "admin"
            ) {

                return Response.json(
                    {
                        error:
                            "Solo administradores pueden crear restricciones globales"
                    },
                    {
                        status: 403
                    }
                );
            }

        } else {

            // =========================
            // EVENT REQUIRED
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

            // =========================
            // STAFF PERMISSIONS
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
                        "dietary_restrictions.create"
                    );

                if (!allowed) {

                    return Response.json(
                        {
                            error:
                                "Sin permisos para crear restricciones"
                        },
                        {
                            status: 403
                        }
                    );
                }
            }

            // =========================
            // EVENT
            // =========================

            const [events] =
                await db.query(
                    `
                    SELECT
                        id,
                        business_id
                    FROM tags_events
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [event_id]
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

            const event =
                events[0];

            // =========================
            // BUSINESS SECURITY
            // =========================

            if (
                session.role !== "admin"
                &&
                event.business_id !==
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
        // SLUG
        // =========================

        const slug =
            createSlug(name);

        // =========================
        // DUPLICATES
        // =========================

        let duplicateQuery = "";
        let duplicateParams = [];

        if (is_system) {

            duplicateQuery = `
                SELECT id

                FROM tags_event_dietary_restrictions

                WHERE
                    is_system = 1
                    AND slug = ?

                LIMIT 1
            `;

            duplicateParams = [slug];

        } else {

            duplicateQuery = `
                SELECT id

                FROM tags_event_dietary_restrictions

                WHERE
                    event_id = ?
                    AND slug = ?

                LIMIT 1
            `;

            duplicateParams = [
                event_id,
                slug
            ];
        }

        const [duplicates] =
            await db.query(
                duplicateQuery,
                duplicateParams
            );

        if (duplicates.length) {

            return Response.json(
                {
                    error:
                        "La restricción ya existe"
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
                INSERT INTO
                tags_event_dietary_restrictions
                (

                    event_id,

                    name,
                    slug,

                    color,
                    icon,

                    is_system,

                    severity,

                    requires_kitchen_attention,

                    created_at

                )

                VALUES
                (

                    ?,

                    ?,
                    ?,

                    ?,
                    ?,

                    ?,

                    ?,

                    ?,

                    NOW()

                )
                `,
                [

                    is_system
                        ? null
                        : event_id,

                    name,
                    slug,

                    color || null,
                    icon || null,

                    is_system
                        ? 1
                        : 0,

                    severity || "preference",

                    requires_kitchen_attention
                        ? 1
                        : 0
                ]
            );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                event_id || null,

            actionCode:
                "dietary_restrictions.create",

            entityType:
                "dietary_restriction",

            entityId:
                result.insertId,

            description:
                `Restricción creada: ${name}`,

            metadata: {

                name,
                slug,

                is_system,

                severity

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
                    err.message ||
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}