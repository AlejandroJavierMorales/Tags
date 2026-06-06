export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { createEventLog }
    from "@/app/modules/e-events/lib/createEventLog";

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
            event_id,
            name,
            color
        } = body;

        if (
            !event_id
            ||
            !name
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

        const [result] =
            await db.query(
                `
                INSERT INTO
                tags_event_attendee_tags
                (
                    event_id,
                    name,
                    color,
                    created_at
                )
                VALUES
                (?, ?, ?, NOW())
                `,
                [
                    event_id,
                    name,
                    color || "#111827"
                ]
            );

        await createEventLog({

            eventId:
                event_id,

            staffId:
                session.staffId || null,

            actionCode:
                "attendee_tags.create",

            entityType:
                "attendee_tag",

            entityId:
                result.insertId,

            description:
                `Tag creado: ${name}`,

            metadata: {

                tag_name:
                    name,

                color
            },

            req
        });

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
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}