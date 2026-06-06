// ========================================
// /api/events/attendee-tags/delete/route.js
// ========================================
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

export async function DELETE(req) {

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
        // BODY
        // =========================

        const body =
            await req.json();

        const { id } =
            body;

        // =========================
        // VALIDATION
        // =========================

        if (!id) {

            return Response.json(
                {
                    error:
                        "ID requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // DELETE RELATIONS
        // =========================

        await db.query(
            `
            DELETE FROM
                tags_event_attendee_tag_relations

            WHERE tag_id = ?
            `,
            [id]
        );

        // =========================
        // DELETE TAG
        // =========================

        await db.query(
            `
            DELETE FROM
                tags_events_tags

            WHERE id = ?

            LIMIT 1
            `,
            [id]
        );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({
            ok: true
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