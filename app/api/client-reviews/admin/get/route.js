// =====================================
// API: /api/client-reviews/admin/get
// Descripción: Obtiene la configuración completa de ClientsReviews para edición.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function parseJson(value, fallback = {}) {


if (!value) {
    return fallback;
}

if (typeof value === "object") {
    return value;
}

try {
    return JSON.parse(value);
} catch {
    return fallback;
}


}

export async function GET(req) {


try {

    const { searchParams } =
        new URL(req.url);

    const businessId =
        searchParams.get("businessId");

    const qrCodeId =
        searchParams.get("qrCodeId");

    if (!businessId || !qrCodeId) {

        return Response.json(
            {
                error:
                    "businessId y qrCodeId son requeridos"
            },
            {
                status: 400
            }
        );
    }

    // =====================================
    // PAGE
    // =====================================

    const [pageRows] =
        await db.query(
            `
            SELECT *
            FROM tags_qr_pages
            WHERE business_id = ?
            AND qr_code_id = ?
            AND page_type = 'client_reviews'
            LIMIT 1
            `,
            [
                businessId,
                qrCodeId
            ]
        );

    const page =
        pageRows[0];

    if (!page) {

        return Response.json(
            {
                error:
                    "ClientsReviews no encontrado"
            },
            {
                status: 404
            }
        );
    }

    // =====================================
    // FORM + THEME
    // =====================================

    const [formRows] =
        await db.query(
            `
            SELECT
                f.*,

                th.id AS selected_theme_id,
                th.code AS theme_code,
                th.name AS theme_name,
                th.description AS theme_description,
                th.css_tokens AS theme_tokens_json

            FROM tags_client_review_forms f

            LEFT JOIN tags_qr_page_themes th
                ON th.id = f.theme_id

            WHERE f.business_id = ?
            AND f.qr_code_id = ?
            AND f.page_id = ?
            LIMIT 1
            `,
            [
                businessId,
                qrCodeId,
                page.id
            ]
        );

    const form =
        formRows[0];

    if (!form) {

        return Response.json(
            {
                error:
                    "Formulario no encontrado"
            },
            {
                status: 404
            }
        );
    }

    form.styles_json =
        parseJson(
            form.styles_json,
            {}
        );

    form.settings_json =
        parseJson(
            form.settings_json,
            {}
        );

    form.theme_tokens =
        parseJson(
            form.theme_tokens_json,
            {}
        );

    // =====================================
    // QUESTIONS
    // =====================================

    const [questions] =
        await db.query(
            `
            SELECT *
            FROM tags_client_review_questions
            WHERE form_id = ?
            ORDER BY sort_order ASC, id ASC
            `,
            [
                form.id
            ]
        );

    const normalizedQuestions =
        questions.map(question => ({
            ...question,

            styles_json:
                parseJson(
                    question.styles_json,
                    {}
                ),

            settings_json:
                parseJson(
                    question.settings_json,
                    {}
                )
        }));

    // =====================================
    // SUMMARY
    // =====================================

    const [[summary]] =
        await db.query(
            `
            SELECT
                COUNT(*) AS total_responses,
                AVG(average_rating) AS average_rating,
                SUM(
                    CASE
                        WHEN google_clicked = 1 THEN 1
                        ELSE 0
                    END
                ) AS google_clicks
            FROM tags_client_review_responses
            WHERE form_id = ?
            `,
            [
                form.id
            ]
        );

    return Response.json({
        ok: true,
        page,
        form,
        questions:
            normalizedQuestions,
        summary
    });

} catch (err) {

    console.error(
        "CLIENT REVIEWS ADMIN GET ERROR:",
        err
    );

    return Response.json(
        {
            error:
                "Error obteniendo ClientsReviews"
        },
        {
            status: 500
        }
    );
}


}
