export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

export async function GET() {

    try {

        const [rows] =
            await db.query(
                `
                SELECT
                    id,
                    slug,
                    name,
                    description,
                    icon,
                    config_schema,
                    is_system

                FROM tags_event_invitation_block_types

                WHERE is_active = 1

                ORDER BY name ASC
                `
            );

        return Response.json({
            ok: true,
            block_types: rows
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