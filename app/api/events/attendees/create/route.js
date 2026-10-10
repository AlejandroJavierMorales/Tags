export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

import { ensureEventAttendeeCredential }
    from "@/app/modules/e-events/lib/ensureEventAttendeeCredential";

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

                    "attendees.create"
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
            email,
            phone
        } = body;

        // =========================
        // VALIDATION
        // =========================

        if (
            !event_id
            ||
            !name
        ) {

            return Response.json(
                {
                    error:
                        "Faltan datos"
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
        // CREATE ATTENDEE
        // =========================

        const [result] =
            await db.query(
                `
                INSERT INTO tags_event_attendees (

                    event_id,
                    name,
                    email,
                    phone,
                    status,
                    created_at

                )

                VALUES (

                    ?, ?, ?, ?,
                    'pending',
                    NOW()

                )
                `,
                [
                    event_id,
                    name,
                    email || null,
                    phone || null
                ]
            );

        const attendeeId =
            result.insertId;

        // =========================
        // BASE URL
        // =========================

        const base =
            process.env.NODE_ENV === "development"
                ? "http://localhost:3000"
                : process.env.NEXT_PUBLIC_BASE_URL_PROD;

        const credential = await ensureEventAttendeeCredential({
            connection: db,
            attendeeId,
            baseUrl: base
        });

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            attendee_id:
                attendeeId,

            qr_id:
                credential.qrId,

            qr_code:
                credential.qrCode,

            qr_token:
                credential.qrToken,

            qr_url:
                credential.qrUrl
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
