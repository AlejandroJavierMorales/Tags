export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import React from "react";

import { renderToStream }
    from "@react-pdf/renderer";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";
import EventDietaryReportDocument from "@/app/modules/e-events/components/reports/EventDietaryReportDocument";



export async function GET(req) {

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
        // PARAMS
        // =========================

        const { searchParams } =
            new URL(req.url);

        const eventId =
            searchParams.get("event_id");

        const mode =
            searchParams.get("mode")
            || "restriction";

        if (!eventId) {

            return Response.json(
                {
                    error:
                        "event_id requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // EVENT
        // =========================

        const [events] =
            await db.query(
                `
                SELECT
                    id,
                    name

                FROM tags_events

                WHERE id = ?

                LIMIT 1
                `,
                [eventId]
            );

        if (!events.length) {

            return Response.json(
                {
                    error:
                        "Evento no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const event =
            events[0];

        // =========================
        // REPORT
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    dr.id,
                    dr.name,
                    dr.slug,
                    dr.color,
                    dr.severity,

                    COUNT(
                        DISTINCT adr.attendee_id
                    ) AS total_attendees,

                    COALESCE(

                        (
                            SELECT JSON_ARRAYAGG(

                                JSON_OBJECT(

                                    'id', a.id,
                                    'name', a.name,
                                    'email', a.email,
                                    'phone', a.phone,

                                    'custom_dietary_notes',
                                    a.custom_dietary_notes

                                )

                            )

                            FROM tags_event_attendee_dietary_relations adr2

                            INNER JOIN tags_event_attendees a
                                ON a.id = adr2.attendee_id

                            WHERE adr2.restriction_id = dr.id

                        ),

                        JSON_ARRAY()

                    ) AS attendees

                FROM tags_event_dietary_restrictions dr

                LEFT JOIN tags_event_attendee_dietary_relations adr
                    ON adr.restriction_id = dr.id

                WHERE
                    dr.event_id = ?
                    OR dr.is_system = 1

                GROUP BY dr.id

                ORDER BY
                    total_attendees DESC,
                    dr.name ASC
                `,
                [eventId]
            );

        const report =
            rows.map(item => ({

                ...item,

                attendees:
                    typeof item.attendees === "string"
                        ? JSON.parse(item.attendees)
                        : item.attendees || []

            }));

        // =========================
        // PDF
        // =========================

        const stream = await renderToStream(

            <EventDietaryReportDocument
                event={event}
                report={report}
                mode={mode}
            />
        );

        return new Response(
            stream,
            {

                headers: {

                    "Content-Type":
                        "application/pdf",

                    "Content-Disposition":
                        `inline; filename="dietary-report-${eventId}.pdf"`
                }
            }
        );

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    "Error generando PDF"
            },
            {
                status: 500
            }
        );
    }
}