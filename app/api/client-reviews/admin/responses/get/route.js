// =====================================
// API: /api/client-reviews/admin/responses/get
// Descripción: Obtiene el detalle completo de una respuesta de ClientsReviews.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const id =
            searchParams.get("id");

        const businessId =
            searchParams.get("businessId");

        if (!id || !businessId) {
            return Response.json(
                { error: "id y businessId son requeridos" },
                { status: 400 }
            );
        }

        const [responseRows] =
            await db.query(
                `
                SELECT
                    r.*,
                    q.code AS qr_code,
                    q.label AS qr_label,
                    p.slug AS page_slug,
                    f.title AS form_title
                FROM tags_client_review_responses r

                LEFT JOIN tags_qr_codes q
                    ON q.id = r.qr_code_id

                LEFT JOIN tags_qr_pages p
                    ON p.id = r.page_id

                LEFT JOIN tags_client_review_forms f
                    ON f.id = r.form_id

                WHERE r.id = ?
                AND r.business_id = ?
                LIMIT 1
                `,
                [
                    id,
                    businessId
                ]
            );

        const response =
            responseRows[0];

        if (!response) {
            return Response.json(
                { error: "Reseña no encontrada" },
                { status: 404 }
            );
        }

        const [answers] =
            await db.query(
                `
                SELECT
                    a.id,
                    a.question_id,
                    a.rating,
                    a.comment,
                    a.created_at,

                    q.question_text,
                    q.helper_text,
                    q.rating_label_1,
                    q.rating_label_2,
                    q.rating_label_3,
                    q.rating_label_4,
                    q.rating_label_5
                FROM tags_client_review_answers a

                LEFT JOIN tags_client_review_questions q
                    ON q.id = a.question_id

                WHERE a.response_id = ?
                ORDER BY q.sort_order ASC, a.id ASC
                `,
                [id]
            );

        return Response.json({
            ok: true,
            response,
            answers
        });

    } catch (err) {
        console.error(
            "CLIENT REVIEWS RESPONSE GET ERROR:",
            err
        );

        return Response.json(
            { error: "Error obteniendo reseña" },
            { status: 500 }
        );
    }
}