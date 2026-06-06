export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

export async function DELETE(req) {

    try {

        const session =
            await getEventSession();

        if (!session) {

            return Response.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } =
            new URL(req.url);

        const attendeeId =
            searchParams.get(
                "attendee_id"
            );

        const tagId =
            searchParams.get(
                "tag_id"
            );

        if (
            !attendeeId
            ||
            !tagId
        ) {

            return Response.json(
                {
                    error:
                        "Datos incompletos"
                },
                {
                    status: 400
                }
            );
        }

        await db.query(
            `
            DELETE FROM
                tags_event_attendee_tags

            WHERE
                attendee_id = ?
            AND
                tag_id = ?
            `,
            [
                attendeeId,
                tagId
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