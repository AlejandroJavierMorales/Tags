export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

export async function PUT(req) {

    try {

        const session =
            await getEventSession();

        if (!session) {

            return Response.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body =
            await req.json();

        const {
            id,
            name,
            color
        } = body;

        await db.query(
            `
            UPDATE tags_event_attendee_tags

            SET
                name = ?,
                color = ?

            WHERE id = ?
            `,
            [
                name,
                color,
                id
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