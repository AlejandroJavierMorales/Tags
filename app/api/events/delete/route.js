import { db } from "@/app/lib/tags-db";

export async function DELETE(req) {

    try {

        const body =
            await req.json();

        const { id } = body;

        if (!id) {

            return Response.json(
                {
                    error: "Falta id"
                },
                {
                    status: 400
                }
            );
        }

        await db.query(
            `
            DELETE FROM tags_events
            WHERE id = ?
            `,
            [id]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error: "Error interno"
            },
            {
                status: 500
            }
        );
    }
}