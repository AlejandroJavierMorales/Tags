// =====================================
// API: /api/client-reviews/admin/responses/public
// Descripción:
// Actualiza el estado de publicación pública
// de una respuesta de Tags Reviews.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {

    try {

        const {
            id,
            businessId,
            is_public
        } = await req.json();

        if (
            !id ||
            !businessId ||
            typeof is_public === "undefined"
        ) {

            return Response.json(
                {
                    error:
                        "id, businessId e is_public son requeridos"
                },
                {
                    status: 400
                }
            );

        }

        const publicValue =
            Number(is_public) ? 1 : 0;

        const [rows] =
            await db.query(
                `
                SELECT id
                FROM tags_client_review_responses
                WHERE id = ?
                AND business_id = ?
                LIMIT 1
                `,
                [
                    id,
                    businessId
                ]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Reseña no encontrada"
                },
                {
                    status: 404
                }
            );

        }

        await db.query(
            `
            UPDATE tags_client_review_responses
            SET
                is_public = ?,
                updated_at = NOW()
            WHERE id = ?
            AND business_id = ?
            `,
            [
                publicValue,
                id,
                businessId
            ]
        );

        return Response.json({
            ok: true,
            is_public:
                Boolean(publicValue)
        });

    } catch (err) {

        console.error(
            "CLIENT REVIEW RESPONSE PUBLIC ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error actualizando publicación"
            },
            {
                status: 500
            }
        );

    }

}