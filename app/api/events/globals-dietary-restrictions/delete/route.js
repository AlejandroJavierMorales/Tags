// ============================================
// /api/events/global-dietary-restrictions/delete/route.js
// ============================================

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
        // ONLY ADMINS
        // =========================

        const canManageGlobalRestrictions =

    session.role === "admin"
    ||
    session.role === "event_client";

if (!canManageGlobalRestrictions) {

    return Response.json(
        {
            error:
                "Sin permisos para administrar restricciones globales"
        },
        {
            status: 403
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
        // RESTRICTION
        // =========================

        const [rows] =
            await db.query(
                `

                SELECT
                    *

                FROM
                    tags_event_dietary_restrictions

                WHERE

                    id = ?

                    AND

                    is_system = 1

                LIMIT 1

                `,
                [id]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Restricción global no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const restriction =
            rows[0];

        // =========================
        // CHECK USAGE
        // =========================

        const [usageRows] =
            await db.query(
                `

                SELECT
                    COUNT(*) AS total

                FROM
                    tags_event_attendee_dietary_relations

                WHERE
                    restriction_id = ?

                `,
                [id]
            );

        const totalUsage =
            Number(
                usageRows[0]?.total || 0
            );

        if (totalUsage > 0) {

            return Response.json(
                {
                    error:
                        "La restricción está siendo utilizada por invitados"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // DELETE
        // =========================

        await db.query(
            `

            DELETE FROM
                tags_event_dietary_restrictions

            WHERE

                id = ?

                AND

                is_system = 1

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