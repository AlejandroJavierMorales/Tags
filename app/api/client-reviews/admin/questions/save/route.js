// =====================================
// API: /api/client-reviews/admin/questions/save
// Descripción: Guarda, actualiza, elimina y reordena preguntas configurables.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function safeJSON(value) {
    if (!value) return {};
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

export async function POST(req) {
    const conn = await db.getConnection();

    try {
        const {
            formId,
            businessId,
            questions = []
        } = await req.json();

        if (!formId || !businessId) {
            return Response.json(
                { error: "formId y businessId son requeridos" },
                { status: 400 }
            );
        }

        const [formRows] = await conn.query(
            `
            SELECT id
            FROM tags_client_review_forms
            WHERE id = ?
            AND business_id = ?
            LIMIT 1
            `,
            [formId, businessId]
        );

        if (!formRows.length) {
            return Response.json(
                { error: "Formulario no encontrado" },
                { status: 404 }
            );
        }

        await conn.beginTransaction();

        const keepIds = [];

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            if (!q.question_text) continue;

            if (q.id) {
                await conn.query(
                    `
                    UPDATE tags_client_review_questions
                    SET
                        question_text = ?,
                        helper_text = ?,
                        rating_label_1 = ?,
                        rating_label_2 = ?,
                        rating_label_3 = ?,
                        rating_label_4 = ?,
                        rating_label_5 = ?,
                        allow_comment = ?,
                        comment_placeholder = ?,
                        is_required = ?,
                        is_visible = ?,
                        sort_order = ?,
                        styles_json = ?,
                        settings_json = ?,
                        updated_at = NOW()
                    WHERE id = ?
                    AND form_id = ?
                    `,
                    [
                        q.question_text,
                        q.helper_text || null,
                        q.rating_label_1 || "Malo",
                        q.rating_label_2 || "Regular",
                        q.rating_label_3 || "Bueno",
                        q.rating_label_4 || "Muy bueno",
                        q.rating_label_5 || "Excelente",
                        Number(q.allow_comment ?? 1),
                        q.comment_placeholder || "Contanos un poco más",
                        Number(q.is_required ?? 1),
                        Number(q.is_visible ?? 1),
                        i + 1,
                        JSON.stringify(safeJSON(q.styles_json)),
                        JSON.stringify(safeJSON(q.settings_json)),
                        q.id,
                        formId
                    ]
                );

                keepIds.push(Number(q.id));

            } else {
                const [result] = await conn.query(
                    `
                    INSERT INTO tags_client_review_questions (
                        form_id,
                        question_text,
                        helper_text,
                        rating_label_1,
                        rating_label_2,
                        rating_label_3,
                        rating_label_4,
                        rating_label_5,
                        allow_comment,
                        comment_placeholder,
                        is_required,
                        is_visible,
                        sort_order,
                        styles_json,
                        settings_json
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        formId,
                        q.question_text,
                        q.helper_text || null,
                        q.rating_label_1 || "Malo",
                        q.rating_label_2 || "Regular",
                        q.rating_label_3 || "Bueno",
                        q.rating_label_4 || "Muy bueno",
                        q.rating_label_5 || "Excelente",
                        Number(q.allow_comment ?? 1),
                        q.comment_placeholder || "Contanos un poco más",
                        Number(q.is_required ?? 1),
                        Number(q.is_visible ?? 1),
                        i + 1,
                        JSON.stringify(safeJSON(q.styles_json)),
                        JSON.stringify(safeJSON(q.settings_json))
                    ]
                );

                keepIds.push(result.insertId);
            }
        }

        if (keepIds.length > 0) {
            await conn.query(
                `
                DELETE FROM tags_client_review_questions
                WHERE form_id = ?
                AND id NOT IN (${keepIds.map(() => "?").join(",")})
                `,
                [formId, ...keepIds]
            );
        } else {
            await conn.query(
                `
                DELETE FROM tags_client_review_questions
                WHERE form_id = ?
                `,
                [formId]
            );
        }

        await conn.commit();

        return Response.json({
            ok: true
        });

    } catch (err) {
        await conn.rollback();

        console.error("CLIENT REVIEWS QUESTIONS SAVE ERROR:", err);

        return Response.json(
            { error: "Error guardando preguntas" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}