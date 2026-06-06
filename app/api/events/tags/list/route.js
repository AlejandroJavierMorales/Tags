// ========================================
// /api/events/attendee-tags/list/route.js
// ========================================
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

export async function GET() {

    try {

        // =========================
        // SESSION
        // =========================

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

        // =========================
        // QUERY
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    id,
                    name,
                    color,
                    created_at

                FROM tags_events_tags

                ORDER BY
                    name ASC
                `
            );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            data: rows
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    err.message ||
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}