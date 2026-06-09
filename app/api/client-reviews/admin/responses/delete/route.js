// =====================================
// API: /api/client-reviews/admin/responses/delete
// Descripción: Elimina una reseña de ClientsReviews y sus respuestas asociadas.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    const conn = await db.getConnection();

    try {
        const {
            id,
            businessId
        } = await req.json();

        if (!id || !businessId) {
            return Response.json(
                { error: "id y businessId son requeridos" },
                { status: 400 }
            );
        }

        const [rows] = await conn.query(
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
                { error: "Reseña no encontrada" },
                { status: 404 }
            );
        }

        await conn.beginTransaction();

        await conn.query(
            `
            DELETE FROM tags_client_review_events
            WHERE response_id = ?
            `,
            [id]
        );

        await conn.query(
            `
            DELETE FROM tags_client_review_answers
            WHERE response_id = ?
            `,
            [id]
        );

        await conn.query(
            `
            DELETE FROM tags_client_review_responses
            WHERE id = ?
            AND business_id = ?
            `,
            [
                id,
                businessId
            ]
        );

        await conn.commit();

        return Response.json({
            ok: true
        });

    } catch (err) {
        await conn.rollback();

        console.error(
            "CLIENT REVIEWS DELETE RESPONSE ERROR:",
            err
        );

        return Response.json(
            { error: "Error eliminando reseña" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}