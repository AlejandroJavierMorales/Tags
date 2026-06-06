// ============================================
// /api/e-events/attendee-dietary-relations/save/route.js
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
                    "attendee_dietary_relations.edit"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para editar restricciones del invitado"
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

        console.log(
            "BODY DE RESTRICCIONES ALIMENTARIAS",
            JSON.stringify(body, null, 2)
        );

        const {

            attendee_id,

            restrictions,

            dietary_notes,
            custom_dietary_notes

        } = body;

        // =========================
        // NORMALIZE RESTRICTIONS
        // =========================

        const normalizedRestrictions =

            (restrictions || [])
                .map(item =>

                    typeof item === "object"
                        ? Number(item.id)
                        : Number(item)
                )
                .filter(Boolean);

        // =========================
        // VALIDATION
        // =========================

        if (!attendee_id) {

            return Response.json(
                {
                    error:
                        "attendee_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (
            restrictions
            &&
            !Array.isArray(restrictions)
        ) {

            return Response.json(
                {
                    error:
                        "Formato inválido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // ATTENDEE
        // =========================

        const [attendees] =
            await db.query(
                `
                SELECT

                    a.id,
                    a.event_id,

                    e.business_id

                FROM tags_event_attendees a

                INNER JOIN tags_events e
                    ON e.id = a.event_id

                WHERE a.id = ?

                LIMIT 1
                `,
                [attendee_id]
            );

        if (!attendees.length) {

            return Response.json(
                {
                    error:
                        "Invitado no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const attendee =
            attendees[0];

        // =========================
        // BUSINESS SECURITY
        // =========================

        if (
            session.role !== "admin"
            &&
            attendee.business_id !==
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

        // =========================
        // VALIDATE RESTRICTIONS
        // =========================

        if (
            normalizedRestrictions.length
        ) {

            const placeholders =
                normalizedRestrictions
                    .map(() => "?")
                    .join(",");

            const [validRestrictions] =
                await db.query(
                    `
                    SELECT

                        id,
                        event_id,
                        is_system

                    FROM
                    tags_event_dietary_restrictions

                    WHERE id IN (${placeholders})
                    `,
                    normalizedRestrictions
                );

            if (
                validRestrictions.length
                !==
                normalizedRestrictions.length
            ) {

                return Response.json(
                    {
                        error:
                            "Restricciones inválidas"
                    },
                    {
                        status: 400
                    }
                );
            }

            for (const item of validRestrictions) {

                const valid =

                    Number(item.is_system) === 1
                    ||
                    Number(item.event_id)
                    ===
                    Number(attendee.event_id);

                if (!valid) {

                    return Response.json(
                        {
                            error:
                                "La restricción no pertenece al evento"
                        },
                        {
                            status: 400
                        }
                    );
                }
            }
        }

        // =========================
        // DELETE OLD RELATIONS
        // =========================

        await db.query(
            `
            DELETE FROM
            tags_event_attendee_dietary_relations

            WHERE attendee_id = ?
            `,
            [attendee_id]
        );

        // =========================
        // INSERT NEW RELATIONS
        // =========================

        if (
            normalizedRestrictions.length
        ) {

            for (const restrictionId of normalizedRestrictions) {

                await db.query(
                    `
                    INSERT INTO
                    tags_event_attendee_dietary_relations
                    (

                        attendee_id,
                        restriction_id,

                        created_at

                    )

                    VALUES
                    (

                        ?,
                        ?,

                        NOW()

                    )
                    `,
                    [

                        attendee_id,
                        restrictionId
                    ]
                );
            }
        }

        // =========================
        // UPDATE ATTENDEE NOTES
        // =========================

        await db.query(
            `
            UPDATE
            tags_event_attendees

            SET

                dietary_notes = ?,
                custom_dietary_notes = ?,
                updated_at = NOW()

            WHERE id = ?
            `,
            [

                dietary_notes || null,
                custom_dietary_notes || null,

                attendee_id
            ]
        );

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                attendee.event_id,

            actionCode:
                "attendee_dietary_relations.edit",

            entityType:
                "attendee",

            entityId:
                attendee_id,

            description:
                "Restricciones alimentarias actualizadas",

            metadata: {

                attendee_id,

                restrictions:
                    normalizedRestrictions,

                dietary_notes,
                custom_dietary_notes

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