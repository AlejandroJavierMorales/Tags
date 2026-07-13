// =====================================
// API: /api/store/admin/product-reviews/public
// Descripción:
// Publica u oculta una reseña de Commerce
// Reviews para mostrarla en la tienda.
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
                        "id, businessId e is_public son requeridos."
                },
                {
                    status: 400
                }
            );

        }

        const [result] =
            await db.query(
                `
                UPDATE
                    tags_commerce_item_reviews
                SET
                    is_public = ?,
                    updated_at = NOW()
                WHERE
                    id = ?
                AND
                    business_id = ?
                `,
                [
                    Number(is_public) ? 1 : 0,
                    id,
                    businessId
                ]
            );

        if (
            result.affectedRows === 0
        ) {

            return Response.json(
                {
                    error:
                        "Reseña no encontrada."
                },
                {
                    status: 404
                }
            );

        }

        return Response.json({

            ok: true

        });

    } catch (err) {

        console.error(
            "STORE PRODUCT REVIEW PUBLIC ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error actualizando la publicación."
            },
            {
                status: 500
            }
        );

    }

}