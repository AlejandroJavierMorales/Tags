export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db } from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/lib/geEventSession";

export async function GET(req) {

    try {

        // =========================
        // SESSION
        // =========================

        const session =
            await getEventSession();
        console.log("Session:::::::::: " + JSON.stringify(session))

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
        // STAFF VALIDATION
        // =========================

        if (
            session.type !== "event_staff"
        ) {

            return Response.json(
                {
                    error:
                        "Solo staff"
                },
                {
                    status: 403
                }
            );
        }

        // =========================
        // FILTERS
        // =========================

        const { searchParams } =
            new URL(req.url);

        const search =
            searchParams.get("search");

        const status =
            searchParams.get("status");

        // =========================
        // SQL
        // =========================

        let sql = `
            SELECT

                e.*,

                es.staff_id

            FROM
                tags_events e

            INNER JOIN
                tags_events_event_staff es

                    ON es.event_id = e.id

            WHERE
                es.staff_id = ?
        `;

        const params = [
            session.staffId
        ];

        // =========================
        // SEARCH
        // =========================

        if (search) {

            sql += `
                AND e.name LIKE ?
            `;

            params.push(
                `%${search}%`
            );
        }

        // =========================
        // STATUS
        // =========================

        if (status) {

            sql += `
                AND e.status = ?
            `;

            params.push(status);
        }

        // =========================
        // ORDER
        // =========================

        sql += `
            ORDER BY e.id DESC
        `;

        // =========================
        // QUERY
        // =========================

        const [rows] =
            await db.query(
                sql,
                params
            );

            

        return Response.json({

            ok: true,

            data: rows
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