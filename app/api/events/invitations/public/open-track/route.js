export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            token
        } = body;

        if (!token) {

            return Response.json(
                {
                    error:
                        "token requerido"
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
                    g.id,
                    g.invitation_id,
                    g.attendee_id,

                    i.published_at,
                    i.is_active

                FROM
                    tags_event_invitation_guests g

                INNER JOIN
                    tags_event_invitations i
                        ON i.id = g.invitation_id

                WHERE
                    g.access_token = ?

                LIMIT 1
                `,
                [
                    token
                ]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Invitación no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const guest =
            rows[0];

        if (
            !guest.published_at
            ||
            Number(guest.is_active) !== 1
        ) {

            return Response.json(
                {
                    error:
                        "Invitación no publicada"
                },
                {
                    status: 403
                }
            );
        }

        const forwarded =
            req.headers.get(
                "x-forwarded-for"
            );

        const ipAddress =
            forwarded
                ? forwarded
                    .split(",")[0]
                    .trim()
                : (
                    req.headers.get("x-real-ip")
                    ||
                    "unknown"
                );

        await db.query(
            `
            UPDATE
                tags_event_invitation_guests
            SET
                viewed_at =
                    COALESCE(
                        viewed_at,
                        NOW()
                    ),
                last_access_at =
                    NOW(),
                updated_at =
                    NOW()
            WHERE
                id = ?
            `,
            [
                guest.id
            ]
        );

        await db.query(
            `
            UPDATE
                tags_event_attendees
            SET
                invitation_status =
                    'opened',
                viewed_at =
                    COALESCE(
                        viewed_at,
                        NOW()
                    ),
                invite_opened_at =
                    COALESCE(
                        invite_opened_at,
                        NOW()
                    ),
                updated_at =
                    NOW()
            WHERE
                id = ?
            `,
            [
                guest.attendee_id
            ]
        );

        await db.query(
            `
            INSERT INTO
                tags_event_invitation_access_logs
            (
                invitation_id,
                invitation_guest_id,
                ip_address,
                access_result,
                created_at
            )
            VALUES
            (
                ?,
                ?,
                ?,
                'success',
                NOW()
            )
            `,
            [
                guest.invitation_id,
                guest.id,
                ipAddress
            ]
        );

        return Response.json({

            ok: true,

            invitation_guest_id:
                guest.id,

            invitation_id:
                guest.invitation_id,

            tracked:
                "open"
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    err.message
            },
            {
                status: 500
            }
        );
    }
}