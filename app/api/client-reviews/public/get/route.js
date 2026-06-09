// =====================================
// API: /api/client-reviews/public/get
// Descripción: Obtiene el formulario público de ClientsReviews por slug.
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

    const slug =
        searchParams.get("slug");

    if (!slug) {

        return Response.json(
            {
                error:
                    "slug requerido"
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
            WHERE slug = ?
            AND page_type = 'client_reviews'
            AND status = 'published'
            LIMIT 1
            `,
            [slug]
        );

    const page =
        pageRows[0];

    if (!page) {

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

            WHERE f.page_id = ?
            AND f.status = 'active'
            LIMIT 1
            `,
            [
                page.id
            ]
        );

    const form =
        formRows[0];

    if (!form) {

        return Response.json(
            {
                error:
                    "Formulario inactivo"
            },
            {
                status: 404
            }
        );
    }

    form.settings_json =
        parseJson(
            form.settings_json,
            {}
        );

    form.styles_json =
        parseJson(
            form.styles_json,
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
            SELECT
                id,
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
                sort_order,

                styles_json,
                settings_json

            FROM tags_client_review_questions

            WHERE form_id = ?
            AND is_visible = 1

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

    return Response.json({
        ok: true,
        page,
        form,
        questions:
            normalizedQuestions
    });

} catch (err) {

    console.error(
        "CLIENT REVIEWS PUBLIC GET ERROR:",
        err
    );

    return Response.json(
        {
            error:
                "Error cargando formulario"
        },
        {
            status: 500
        }
    );
}

}
