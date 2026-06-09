// =====================================
// API: /api/client-reviews/public/google-click
// Descripción: Registra que el usuario hizo click en el enlace de Google Reviews.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    try {
        const {
            responseId
        } = await req.json();

        if (!responseId) {
            return Response.json(
                { error: "responseId requerido" },
                { status: 400 }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT
                    id,
                    form_id,
                    business_id,
                    qr_code_id
                FROM tags_client_review_responses
                WHERE id = ?
                LIMIT 1
                `,
                [responseId]
            );

        const response =
            rows[0];

        if (!response) {
            return Response.json(
                { error: "Respuesta no encontrada" },
                { status: 404 }
            );
        }

        await db.query(
            `
            UPDATE tags_client_review_responses
            SET
                google_clicked = 1,
                updated_at = NOW()
            WHERE id = ?
            `,
            [responseId]
        );

        await db.query(
            `
            INSERT INTO tags_client_review_events (
                response_id,
                form_id,
                business_id,
                qr_code_id,
                event_type,
                event_data
            )
            VALUES (?, ?, ?, ?, 'google_click', ?)
            `,
            [
                response.id,
                response.form_id,
                response.business_id,
                response.qr_code_id,
                JSON.stringify({})
            ]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {
        console.error(
            "CLIENT REVIEWS GOOGLE CLICK ERROR:",
            err
        );

        return Response.json(
            { error: "Error registrando click" },
            { status: 500 }
        );
    }
}