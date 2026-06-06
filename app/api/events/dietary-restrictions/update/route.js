// ============================================
// /api/e-events/dietary-restrictions/update/route.js
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

        const body =
            await req.json();

        const {

            id,

            name,

            color,
            icon,

            severity,

            requires_kitchen_attention

        } = body;

        if (
            !id
            ||
            !name
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
                            "Solo administradores pueden editar restricciones globales"
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
                        "dietary_restrictions.edit"
                    );

                if (!allowed) {

                    return Response.json(
                        {
                            error:
                                "Sin permisos para editar restricciones"
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

        const slug =
            createSlug(name);

        await db.query(
            `
            UPDATE
            tags_event_dietary_restrictions

            SET

                name = ?,
                slug = ?,

                color = ?,
                icon = ?,

                severity = ?,

                requires_kitchen_attention = ?,

                updated_at = NOW()

            WHERE id = ?
            `,
            [

                name,
                slug,

                color || null,
                icon || null,

                severity || "preference",

                requires_kitchen_attention
                    ? 1
                    : 0,

                id
            ]
        );

        await createEventLog({

            eventId:
                restriction.event_id || null,

            actionCode:
                "dietary_restrictions.edit",

            entityType:
                "dietary_restriction",

            entityId:
                id,

            description:
                `Restricción editada: ${name}`,

            metadata: {

                name,
                slug,

                severity

            },

            req
        });

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