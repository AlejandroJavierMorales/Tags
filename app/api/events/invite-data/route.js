export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

export async function GET(req) {

    try {

        const { searchParams } =
            new URL(req.url);

        const token =
            searchParams.get("token");

        if (!token) {

            return Response.json(
                {
                    error: "Token requerido"
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

                    a.id,
                    a.name,
                    a.email,
                    a.phone,
                    a.status,
                    a.checked_in_at,

                    e.id AS event_id,
                    e.name AS event_name,
                    e.description,
                    e.location,
                    e.starts_at,
                    e.ends_at,
                    e.cover_image,

                    q.code AS qr_code

                FROM tags_event_attendees a

                INNER JOIN tags_events e
                    ON e.id = a.event_id

                INNER JOIN tags_qr_codes q
                    ON q.id = a.qr_code_id

                WHERE a.qr_token = ?
                LIMIT 1
                `,
                [token]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error: "Invitación inválida"
                },
                {
                    status: 404
                }
            );
        }

        return Response.json({
            ok: true,
            data: rows[0]
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