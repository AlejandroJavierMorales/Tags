// =====================================
// API: /api/client-reviews/admin/responses/status
// Descripción: Cambia el estado administrativo de una respuesta.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

const allowedStatuses =
    ["new", "reviewed", "archived"];

export async function POST(req) {
    try {
        const {
            id,
            businessId,
            status
        } = await req.json();

        if (!id || !businessId || !status) {
            return Response.json(
                { error: "id, businessId y status son requeridos" },
                { status: 400 }
            );
        }

        if (!allowedStatuses.includes(status)) {
            return Response.json(
                { error: "Estado inválido" },
                { status: 400 }
            );
        }

        const [result] =
            await db.query(
                `
                UPDATE tags_client_review_responses
                SET
                    status = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND business_id = ?
                `,
                [
                    status,
                    id,
                    businessId
                ]
            );

        if (result.affectedRows === 0) {
            return Response.json(
                { error: "Reseña no encontrada" },
                { status: 404 }
            );
        }

        return Response.json({
            ok: true
        });

    } catch (err) {
        console.error(
            "CLIENT REVIEWS RESPONSE STATUS ERROR:",
            err
        );

        return Response.json(
            { error: "Error actualizando estado" },
            { status: 500 }
        );
    }
}