// ========================================
// /api/events/attendee-tags/create/route.js
// ========================================
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

export async function POST(req) {

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

        const {
            name,
            color
        } = body;


        // =========================
        // VALIDATION
        // =========================

        if (!name?.trim()) {

            return Response.json(
                {
                    error:
                        "Nombre requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // CREATE
        // =========================

        const [result] =
            await db.query(
                `
                INSERT INTO
                    tags_events_tags
                (
                    name,
                    color,
                    created_at
                )
                VALUES (?, ?, NOW())
                `,
                [

                    name.trim(),

                    color || "#111827"
                ]
            );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            id:
                result.insertId
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