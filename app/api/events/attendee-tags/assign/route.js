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
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body =
            await req.json();

        const {
            attendee_id,
            tag_id
        } = body;

        const [result] = await db.query(
            `
            INSERT INTO
            tags_event_attendee_tag_relations
            (
                attendee_id,
                tag_id
            )
            VALUES
            (?, ?)
            `,
            [
                attendee_id,
                tag_id
            ]
        );

        console.log(result);
        console.log({
            attendee_id,
            tag_id
        });

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