export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const id =
            searchParams.get("id");

        if (!id) {

            return Response.json(
                {
                    error:
                        "id requerido"
                },
                {
                    status: 400
                }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT *

                FROM tags_event_invitation_themes

                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Theme no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        return Response.json({

            ok: true,

            theme:
                rows[0]
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