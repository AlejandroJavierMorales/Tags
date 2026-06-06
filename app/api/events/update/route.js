export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db } from "@/app/lib/tags-db";

export async function PUT(req) {

    try {

        const body =
            await req.json();

        const {
            id,
            business_id,
            name,
            description,
            location,
            starts_at,
            ends_at,
            status
        } = body;

        // =========================
        // VALIDACIONES
        // =========================

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

        if (!business_id) {

            return Response.json(
                {
                    error: "Falta business_id"
                },
                {
                    status: 400
                }
            );
        }

        if (!name) {

            return Response.json(
                {
                    error: "Falta nombre"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // UPDATE
        // =========================

        await db.query(
            `
            UPDATE tags_events
            SET
                business_id = ?,
                name = ?,
                description = ?,
                location = ?,
                starts_at = ?,
                ends_at = ?,
                status = ?,
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                business_id,
                name,
                description || null,
                location || null,
                starts_at || null,
                ends_at || null,
                status || "borrador",
                id
            ]
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