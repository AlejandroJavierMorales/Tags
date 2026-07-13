// =====================================
// API: /api/store/admin/product-reviews/status
// Descripción:
// Actualiza el estado administrativo de
// una reseña de Commerce Reviews.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

const allowedStatuses = [
    "pending",
    "approved",
    "rejected"
];

export async function POST(req) {

    try {

        const {
            id,
            businessId,
            status
        } = await req.json();

        if (
            !id ||
            !businessId ||
            !status
        ) {

            return Response.json(
                {
                    error:
                        "id, businessId y status son requeridos."
                },
                {
                    status: 400
                }
            );

        }

        if (
            !allowedStatuses.includes(status)
        ) {

            return Response.json(
                {
                    error:
                        "Estado inválido."
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
                    status = ?,
                    updated_at = NOW()
                WHERE
                    id = ?
                AND
                    business_id = ?
                `,
                [
                    status,
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
            "STORE PRODUCT REVIEW STATUS ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error actualizando estado."
            },
            {
                status: 500
            }
        );

    }

}