export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { eventAccessError, requireEventAccess } from "@/app/modules/e-events/lib/eventApiAccess";

export async function GET(req) {
    const id =
        Number(
            new URL(req.url)
                .searchParams
                .get("id")
            || 0
        );

    const access =
        await requireEventAccess({
            eventId: id
        });

    if (!access.ok) return eventAccessError(access);

    try {
        const [[event]] =
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
                LIMIT 1
                `,
                [id]
            );

        return Response.json({
            ok: true,
            data: event
        });
    } catch (error) {
        console.error("EVENT GET ERROR", error);
        return Response.json(
            { error: "No se pudo cargar el evento" },
            { status: 500 }
        );
    }
}
