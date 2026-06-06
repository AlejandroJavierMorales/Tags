export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

export async function GET(req) {

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

        const invitation_id =
            searchParams.get(
                "invitation_id"
            );

        if (!invitation_id) {

            return Response.json(
                {
                    error:
                        "invitation_id requerido"
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

                    s.*,

                    i.event_id,

                    e.business_id

                FROM
                    tags_event_invitation_custom_styles s

                INNER JOIN
                    tags_event_invitations i
                        ON i.id = s.invitation_id

                INNER JOIN
                    tags_events e
                        ON e.id = i.event_id

                WHERE
                    s.invitation_id = ?

                LIMIT 1
                `,
                [invitation_id]
            );

        if (!rows.length) {

            return Response.json({

                invitation_id,

                custom_css: "",

                custom_js: ""

            });
        }

        const style =
            rows[0];

        const isOwner =

            session.role === "admin"
            ||
            session.role === "event_client";

        if (!isOwner) {

            const allowed =
                await staffHasPermission(
                    session.staffId,
                    "invitations.styles.view"
                );

            if (!allowed) {

                return Response.json(
                    {
                        error:
                            "Sin permisos"
                    },
                    {
                        status: 403
                    }
                );
            }
        }

        return Response.json(style);

    } catch (err) {

        return Response.json(
            {
                error:
                    err.message
            },
            {
                status: 500
            }
        );
    }
}