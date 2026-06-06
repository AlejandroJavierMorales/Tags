export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db } from "@/app/lib/tags-db";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const id =
            searchParams.get("id");

        if (!id) {

            return Response.json(
                {
                    error: "ID requerido"
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
                    e.*,

                    (
                        SELECT COUNT(*)
                        FROM tags_event_attendees a
                        WHERE a.event_id = e.id
                    ) AS total_attendees,

                    (
                        SELECT COUNT(*)
                        FROM tags_event_attendees a
                        WHERE a.event_id = e.id
                        AND a.status = 'checked_in'
                    ) AS total_checked_in

                FROM tags_events e

                WHERE e.id = ?
                `,
                [id]
            );

        return Response.json({
            data: rows[0]
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