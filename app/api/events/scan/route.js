export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { getEventSession } from "@/app/lib/geEventSession";
import { db }
    from "@/app/lib/tags-db";
import { validateEventPermission } from "@/app/lib/validateEventPermissions";



export async function POST(req) {

    try {

        // =========================
        // AUTH SESSION
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
            code
        } = body;

        // =========================
        // VALIDATION
        // =========================

        if (!code) {

            return Response.json(
                {
                    error: "QR inválido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // GET QR + ATTENDEE
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    q.id AS qr_id,
                    q.code,

                    a.id AS attendee_id,
                    a.name,
                    a.email,
                    a.phone,
                    a.status,
                    a.checked_in_at,
                    a.event_id,

                    e.name AS event_name

                FROM tags_qr_codes q

                INNER JOIN tags_event_attendees a
                    ON a.qr_code_id = q.id

                INNER JOIN tags_events e
                    ON e.id = a.event_id

                WHERE q.code = ?
                LIMIT 1
                `,
                [code]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error: "QR no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const attendee =
            rows[0];

        // =========================
        // EVENT ACCESS
        // =========================

        const access =
            await validateEventPermission({

                businessId:
                    session.businessId,

                eventId:
                    attendee.event_id,

                permission:
                    "checkin_scan"
            });

        if (!access) {

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
        // CANCELLED
        // =========================

        if (
            attendee.status ===
            "cancelled"
        ) {

            return Response.json(
                {
                    error:
                        "Invitación cancelada"
                },
                {
                    status: 403
                }
            );
        }

        // =========================
        // ALREADY CHECKED
        // =========================

        if (
            attendee.status ===
            "checked_in"
        ) {

            return Response.json({

                already_used: true,

                attendee
            });
        }

        // =========================
        // UPDATE ATTENDEE
        // =========================

        await db.query(
            `
            UPDATE tags_event_attendees

            SET

                status = 'checked_in',
                checked_in_at = NOW()

            WHERE id = ?
            `,
            [
                attendee.attendee_id
            ]
        );

        // =========================
        // SAVE CHECKIN
        // =========================

        await db.query(
            `
            INSERT INTO tags_event_checkins (

                event_id,
                attendee_id,
                qr_code_id,
                created_at,
                ip,
                device_info

            )

            VALUES (

                ?, ?, ?,
                NOW(),
                ?, ?

            )
            `,
            [
                attendee.event_id,
                attendee.attendee_id,
                attendee.qr_id,

                req.headers.get(
                    "x-forwarded-for"
                ) || "",

                req.headers.get(
                    "user-agent"
                ) || ""
            ]
        );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            attendee: {

                ...attendee,

                status:
                    "checked_in"
            }
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error: "Error interno"
            },
            {
                status: 500
            }
        );
    }
}