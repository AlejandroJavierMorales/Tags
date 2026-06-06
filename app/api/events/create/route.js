import { getEventSession } from "@/app/lib/geEventSession";
import { db } from "@/app/lib/tags-db";

export async function POST(req) {

    try {

        // =========================
        // SESSION
        // =========================

        const session =
            await getEventSession();

        console.log("Session: " + JSON.stringify(session))

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
            name,
            description,
            location,
            starts_at,
            ends_at,
            status

        } = body;

        const business_id =
            session.businessId;

        // =========================
        // VALIDACIONES
        // =========================

        if (!business_id) {

            return Response.json(
                {
                    error: "Falta business_id"
                },
                {
                    status: 400
                }
            );
        }

        if (!name) {

            return Response.json(
                {
                    error: "Falta nombre"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // GET BUSINESS OWNER
        // =========================

        const [businessRows] =
            await db.query(
                `
                SELECT
                    id,
                    name,
                    email

                FROM tags_businesses

                WHERE id = ?
                LIMIT 1
                `,
                [session.businessId]
            );

        const business =
            businessRows[0];

        console.log(business_id)
        console.log(business)

        if (!business) {

            return Response.json(
                {
                    error: "Empresa no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        // =========================
        // CREATE EVENT
        // =========================

        const [result] =
            await db.query(
                `
                INSERT INTO tags_events (

                    business_id,
                    name,
                    description,
                    location,
                    starts_at,
                    ends_at,
                    status,
                    created_at,
                    updated_at

                )

                VALUES (

                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    NOW(),
                    NOW()

                )
                `,
                [
                    business_id,
                    name,
                    description || null,
                    location || null,
                    starts_at || null,
                    ends_at || null,
                    status || "draft"
                ]
            );

        const eventId =
            result.insertId;

        // =========================
        // CREATE OWNER USER
        // =========================

        await db.query(
            `
            INSERT INTO tags_event_users (

                event_id,
                business_id,

                name,
                email,
                password_hash,

                role,
                status,

                created_at,
                updated_at

            )

            VALUES (

                ?,
                ?,
                ?,
                ?,
                ?,
                'event_owner',
                'active',
                NOW(),
                NOW()

            )
            `,
            [
                eventId,
                business_id,

                business.name,
                business.email,

                "" // temporal hasta definir login real
            ]
        );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,
            id: eventId

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