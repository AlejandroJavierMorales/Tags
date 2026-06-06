export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto
    from "crypto";

import { db }
    from "@/app/lib/tags-db";

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {

            token,

            status,

            companions = [],

            dietary_notes = null,

            custom_dietary_notes = null,

            message = null

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

        if (
            ![
                "confirmed",
                "declined"
            ].includes(status)
        ) {

            return Response.json(
                {
                    error:
                        "status inválido"
                },
                {
                    status: 400
                }
            );
        }

        const [guests] =
            await db.query(
                `
                SELECT

                    g.*,

                    a.id AS attendee_id,
                    a.name,
                    a.plus_ones_allowed,

                    i.id AS invitation_id,
                    i.event_id

                FROM
                    tags_event_invitation_guests g

                INNER JOIN
                    tags_event_attendees a
                        ON a.id =
                        g.attendee_id

                INNER JOIN
                    tags_event_invitations i
                        ON i.id =
                        g.invitation_id

                WHERE
                    g.access_token = ?

                LIMIT 1
                `,
                [
                    token
                ]
            );

        if (!guests.length) {

            return Response.json(
                {
                    error:
                        "Invitación inválida"
                },
                {
                    status: 404
                }
            );
        }

        const guest =
            guests[0];

        const maxCompanions =
            guest.max_companions ??
            guest.plus_ones_allowed ??
            0;

        const normalizedCompanions =
            status === "confirmed"
                ? companions.filter(item =>
                    item?.name &&
                    item.name.trim() !== ""
                )
                : [];

        if (
            normalizedCompanions.length >
            Number(maxCompanions || 0)
        ) {

            return Response.json(
                {
                    error:
                        "Cantidad de acompañantes excedida"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // RSVP V2 - COMPANIONS
        // Sin borrar todos.
        // Mantiene id, qr_token e historial
        // de acompañantes existentes.
        // =========================

        const [currentCompanions] =
            await db.query(
                `
                SELECT
                    *
                FROM
                    tags_event_attendee_companions
                WHERE
                    attendee_id = ?
                `,
                [
                    guest.attendee_id
                ]
            );

        const currentMap =
            new Map();

        for (
            const item
            of currentCompanions
        ) {

            currentMap.set(
                Number(item.id),
                item
            );
        }

        const receivedIds =
            new Set();

        for (
            const companion
            of normalizedCompanions
        ) {

            const companionId =
                companion.id
                    ? Number(companion.id)
                    : null;

            if (
                companionId
                &&
                currentMap.has(companionId)
            ) {

                receivedIds.add(
                    companionId
                );

                await db.query(
                    `
                    UPDATE
                        tags_event_attendee_companions
                    SET

                        name = ?,

                        email = ?,

                        phone = ?,

                        dietary_notes = ?,

                        attendee_status = ?,

                        confirmed_at =
                            CASE
                                WHEN ? = 'confirmed'
                                THEN NOW()
                                ELSE confirmed_at
                            END,

                        declined_at =
                            CASE
                                WHEN ? = 'declined'
                                THEN NOW()
                                ELSE NULL
                            END

                    WHERE
                        id = ?
                        AND attendee_id = ?
                    `,
                    [

                        companion.name,

                        companion.email || null,

                        companion.phone || null,

                        companion.dietary_notes || null,

                        status,

                        status,

                        status,

                        companionId,

                        guest.attendee_id

                    ]
                );

            } else {

                const qrToken =
                    crypto.randomUUID();

                const [insert] =
                    await db.query(
                        `
                        INSERT INTO
                        tags_event_attendee_companions
                        (

                            attendee_id,

                            event_id,

                            name,

                            email,

                            phone,

                            qr_token,

                            attendee_status,

                            dietary_notes,

                            confirmed_at,

                            declined_at,

                            invitation_status,

                            relation_type,

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

                            CASE
                                WHEN ? = 'confirmed'
                                THEN NOW()
                                ELSE NULL
                            END,

                            CASE
                                WHEN ? = 'declined'
                                THEN NOW()
                                ELSE NULL
                            END,

                            'not_sent',

                            'guest',

                            NOW()

                        )
                        `,
                        [

                            guest.attendee_id,

                            guest.event_id,

                            companion.name,

                            companion.email || null,

                            companion.phone || null,

                            qrToken,

                            status,

                            companion.dietary_notes || null,

                            status,

                            status

                        ]
                    );

                receivedIds.add(
                    Number(insert.insertId)
                );
            }
        }

        for (
            const current
            of currentCompanions
        ) {

            if (
                !receivedIds.has(
                    Number(current.id)
                )
            ) {

                await db.query(
                    `
                    DELETE FROM
                        tags_event_attendee_companions
                    WHERE
                        id = ?
                        AND attendee_id = ?
                    LIMIT 1
                    `,
                    [
                        current.id,
                        guest.attendee_id
                    ]
                );
            }
        }

        // =========================
        // RSVP
        // =========================

        const [existingRsvp] =
            await db.query(
                `
                SELECT
                    id
                FROM
                    tags_event_invitation_rsvps
                WHERE
                    invitation_guest_id = ?
                LIMIT 1
                `,
                [
                    guest.id
                ]
            );

        if (
            existingRsvp.length
        ) {

            await db.query(
                `
                UPDATE
                    tags_event_invitation_rsvps
                SET

                    status = ?,

                    companions_count = ?,

                    dietary_notes = ?,

                    message = ?,

                    responded_at = NOW(),
                    updated_at = NOW()

                WHERE
                    invitation_guest_id = ?
                `,
                [

                    status,

                    normalizedCompanions.length,

                    dietary_notes,

                    message,

                    guest.id

                ]
            );

        } else {

            await db.query(
                `
                INSERT INTO
                tags_event_invitation_rsvps
                (

                    invitation_guest_id,

                    status,

                    companions_count,

                    dietary_notes,

                    message,

                    responded_at,

                    created_at,
                    updated_at

                )

                VALUES
                (

                    ?,

                    ?,

                    ?,

                    ?,

                    ?,

                    NOW(),

                    NOW(),
                    NOW()

                )
                `,
                [

                    guest.id,

                    status,

                    normalizedCompanions.length,

                    dietary_notes,

                    message

                ]
            );
        }

        await db.query(
            `
            UPDATE
                tags_event_invitation_guests
            SET

                rsvp_status = ?,

                confirmed_at =
                    CASE
                        WHEN ? = 'confirmed'
                        THEN NOW()
                        ELSE NULL
                    END,

                updated_at =
                    NOW()

            WHERE
                id = ?
            `,
            [

                status,

                status,

                guest.id

            ]
        );

        await db.query(
            `
            UPDATE
                tags_event_attendees
            SET

                status = ?,

                plus_ones_confirmed = ?,

                dietary_notes = ?,

                custom_dietary_notes = ?,

                confirmed_at =
                    CASE
                        WHEN ? = 'confirmed'
                        THEN NOW()
                        ELSE NULL
                    END,

                declined_at =
                    CASE
                        WHEN ? = 'declined'
                        THEN NOW()
                        ELSE NULL
                    END,

                updated_at =
                    NOW()

            WHERE
                id = ?
            `,
            [

                status,

                normalizedCompanions.length,

                dietary_notes,

                custom_dietary_notes,

                status,

                status,

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
                req.headers.get("x-forwarded-for")
                || req.headers.get("x-real-ip")
                || null
            ]
        );

        return Response.json({

            ok: true,

            status,

            companions:
                normalizedCompanions.length

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