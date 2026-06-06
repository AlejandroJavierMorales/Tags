import { db }
    from "@/app/lib/tags-db";

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            token
        } = body;

        // =========================
        // VALIDATION
        // =========================

        if (!token) {

            return Response.json(
                {
                    error: "Token requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // GET ATTENDEE
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    a.*,

                    e.name AS event_name,

                    q.code AS qr_code

                FROM tags_event_attendees a

                INNER JOIN tags_events e
                    ON e.id = a.event_id

                INNER JOIN tags_qr_codes q
                    ON q.id = a.qr_code_id

                WHERE a.qr_token = ?

                LIMIT 1
                `,
                [token]
            );

        // =========================
        // INVALID TOKEN
        // =========================

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Acceso inválido"
                },
                {
                    status: 404
                }
            );
        }

        const attendee =
            rows[0];

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
        // ALREADY USED
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
        // SAFE UPDATE
        // =========================

        const [updateResult] =
            await db.query(
                `
                UPDATE tags_event_attendees

                SET

                    status = 'checked_in',
                    checked_in_at = NOW()

                WHERE id = ?
                AND status != 'checked_in'
                `,
                [
                    attendee.id
                ]
            );

        // =========================
        // RACE CONDITION
        // =========================

        if (
            updateResult.affectedRows === 0
        ) {

            return Response.json({
                already_used: true,
                attendee
            });
        }

        // =========================
        // SAVE CHECKIN
        // =========================

        try {

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

                    attendee.id,

                    attendee.qr_code_id,

                    req.headers.get(
                        "x-forwarded-for"
                    ) || "",

                    req.headers.get(
                        "user-agent"
                    ) || ""
                ]
            );

        } catch (err) {

            // =========================
            // DUPLICATE CHECKIN
            // =========================

            if (
                err.code ===
                "ER_DUP_ENTRY"
            ) {

                return Response.json({
                    already_used: true,
                    attendee
                });
            }

            throw err;
        }

        // =========================
        // SUCCESS
        // =========================

        return Response.json({

            ok: true,

            attendee: {

                ...attendee,

                status:
                    "checked_in",

                checked_in_at:
                    new Date()
            }
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