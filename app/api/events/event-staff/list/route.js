export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

export async function GET(req) {

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

        const { searchParams } =
            new URL(req.url);

        const eventId =
            searchParams.get("event_id");

        // =========================
        // ASSIGNED
        // =========================

        const [assigned] =
            await db.query(
                `
                SELECT
                    s.*
                FROM tags_events_event_staff es

                INNER JOIN tags_events_staff s
                    ON s.id = es.staff_id

                WHERE
                    es.event_id = ?
                `,
                [eventId]
            );

        // =========================
        // AVAILABLE
        // =========================

        const [available] =
            await db.query(
                `
                SELECT *
                FROM tags_events_staff

                WHERE
                    business_id = ?

                AND id NOT IN (

                    SELECT staff_id
                    FROM tags_events_event_staff
                    WHERE event_id = ?

                )
                `,
                [
                    session.businessId,
                    eventId
                ]
            );

        return Response.json({

            ok: true,

            assigned,

            available
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