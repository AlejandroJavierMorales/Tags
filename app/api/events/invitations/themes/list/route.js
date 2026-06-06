export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function GET() {

    try {

        const [themes] =
            await db.query(
                `
                SELECT
                    id,
                    slug,
                    name,
                    preview_image,
                    config_json,
                    is_system

                FROM tags_event_invitation_themes

                WHERE
                    is_active = 1

                ORDER BY
                    is_system DESC,
                    name ASC
                `
            );

        return Response.json({

            ok: true,

            themes
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