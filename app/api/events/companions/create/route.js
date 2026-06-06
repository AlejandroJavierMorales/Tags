export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";

import { db }
    from "@/app/lib/tags-db";

import { createEventLog }
    from "@/app/modules/e-events/lib/createEventLog";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

import { calculateAttendeeSeats }
    from "@/app/modules/e-events/lib/calculateAttendeeSeats";

import { recalculateTableSeats }
    from "@/app/modules/e-events/lib/recalculateTableSeats";

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

                    "companions.create"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos para Crear Acompañantes"
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

            attendee_id,

            name,
            email,
            phone,

            attendee_status,
            dietary_notes,

            relation_type

        } = body;

        // =========================
        // VALIDATION
        // =========================

        if (
            !attendee_id
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

        // =========================
        // ATTENDEE
        // =========================

        const [attendees] =
            await db.query(
                `
                SELECT

                    a.id,
                    a.event_id,
                    a.plus_ones_allowed,

                    e.business_id

                FROM tags_event_attendees a

                INNER JOIN tags_events e
                    ON e.id = a.event_id

                WHERE
                    a.id = ?

                LIMIT 1
                `,
                [
                    attendee_id
                ]
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
            attendee.business_id
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

        // =========================
        // VALIDATE LIMIT
        // =========================

        const [companionsRows] =
            await db.query(
                `
                SELECT COUNT(*) AS total

                FROM tags_event_attendee_companions

                WHERE attendee_id = ?
                `,
                [attendee_id]
            );

        const currentCompanions =
            Number(
                companionsRows[0]?.total || 0
            );

        const allowedCompanions =
            Number(
                attendee.plus_ones_allowed || 0
            );

        if (
            currentCompanions >=
            allowedCompanions
        ) {

            return Response.json(
                {
                    error:
                        "Límite de acompañantes alcanzado"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // TOKEN
        // =========================

        const qrToken =
            crypto.randomUUID();

        // =========================
        // INSERT
        // =========================

        const [result] =
            await db.query(
                `
                INSERT INTO
                tags_event_attendee_companions
                (

                    attendee_id,
                    event_id,

                    qr_token,

                    name,
                    email,
                    phone,

                    attendee_status,

                    invitation_status,

                    dietary_notes,

                    relation_type,

                    created_at

                )

                VALUES
                (

                    ?,
                    ?,

                    ?,

                    ?, ?, ?,

                    ?,

                    'not_sent',

                    ?,

                    ?,

                    NOW()

                )
                `,
                [

                    attendee_id,
                    attendee.event_id,

                    qrToken,

                    name,
                    email || null,
                    phone || null,

                    attendee_status || "pending",

                    dietary_notes || null,

                    relation_type || "guest"
                ]
            );

        // =========================
        // TABLE RELATION
        // =========================

        const [relations] =
            await db.query(
                `
                SELECT table_id

                FROM tags_event_attendee_tables

                WHERE attendee_id = ?

                LIMIT 1
                `,
                [attendee_id]
            );

        if (
            relations.length
            &&
            relations[0].table_id
        ) {

            const tableId =
                relations[0].table_id;

            // =========================
            // REAL SEATS
            // =========================

            const seats =
                await calculateAttendeeSeats(
                    attendee_id
                );

            // =========================
            // UPDATE RELATION
            // =========================

            await db.query(
                `
                UPDATE tags_event_attendee_tables

                SET seats_reserved = ?

                WHERE attendee_id = ?
                `,
                [
                    seats,
                    attendee_id
                ]
            );

            // =========================
            // RECALCULATE TABLE
            // =========================

            await recalculateTableSeats(
                tableId
            );
        }

        // =========================
        // LOG
        // =========================

        await createEventLog({

            eventId:
                attendee.event_id,

            actionCode:
                "companions.create",

            entityType:
                "companion",

            entityId:
                result.insertId,

            description:
                `Acompañante creado: ${name}`,

            metadata: {

                attendee_id,
                name,
                email,

                attendee_status,

                relation_type
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