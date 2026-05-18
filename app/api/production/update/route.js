import { db } from "@/app/lib/tags-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {

    try {

        const {
            id,
            business_id,
            notes,
            quantity
        } = await req.json();

        if (!id) {

            return Response.json(
                {
                    error: "ID requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!quantity || quantity < 1) {

            return Response.json(
                {
                    error:
                        "Cantidad inválida"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // VALIDAR CLIENTE
        // =========================

        if (business_id) {

            const [businessRows] =
                await db.execute(
                    `
                    SELECT id
                    FROM tags_businesses
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [business_id]
                );

            if (!businessRows.length) {

                return Response.json(
                    {
                        error:
                            "Cliente inválido"
                    },
                    {
                        status: 400
                    }
                );
            }
        }

        // =========================
        // UPDATE
        // =========================

        await db.execute(
            `
            UPDATE tags_production_orders
            SET
                business_id = ?,
                quantity = ?,
                notes = ?
            WHERE id = ?
            `,
            [
                business_id || null,
                quantity,
                notes || null,
                id
            ]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.error(
            "UPDATE PRODUCTION ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error actualizando orden"
            },
            {
                status: 500
            }
        );
    }
}