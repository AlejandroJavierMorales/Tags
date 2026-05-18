import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    try {

        const body =
            await req.json();

        const { id } = body;

        await db.execute(`
            DELETE FROM tags_subscriptions
            WHERE id = ?
        `, [id]);

        return Response.json({
            success: true
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    "Error eliminando suscripción"
            },
            {
                status: 500
            }
        );
    }
}