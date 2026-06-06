export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

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
            event_id,
            staff_id
        } = body;

        await db.query(
            `
            INSERT INTO
            tags_events_event_staff (

                event_id,
                staff_id,
                assigned_by,
                created_at

            )

            VALUES (

                ?, ?, ?, NOW()

            )
            `,
            [
                event_id,
                staff_id,
                session.id
            ]
        );

        return Response.json({
            ok: true
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