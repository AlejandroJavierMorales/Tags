// =====================================
// API: /api/client-reviews/admin/get
// Descripción: Obtiene la configuración completa de ClientsReviews para edición.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function parseJson(value, fallback = {}) {
    if (!value) return fallback;

    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function toNumber(value, fallback = 0) {
    const number = Number(value);

    if (Number.isNaN(number)) {
        return fallback;
    }

    return number;
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
                    error: "businessId y qrCodeId son requeridos"
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
                    error: "ClientsReviews no encontrado"
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

                    COALESCE(NULLIF(b.logo_url, ''), f.logo_url) AS logo_url,
                    COALESCE(NULLIF(b.display_name, ''), b.name) AS business_name,
                    b.email AS business_email,
                    b.phone AS business_phone,
                    b.whatsapp AS business_whatsapp,
                    b.address AS business_address,
                    b.website_url AS business_website_url,
                    b.instagram_url AS business_instagram_url,
                    b.facebook_url AS business_facebook_url,

                    th.id AS selected_theme_id,
                    th.code AS theme_code,
                    th.name AS theme_name,
                    th.description AS theme_description,
                    th.css_tokens AS theme_tokens_json

                FROM tags_client_review_forms f

                INNER JOIN tags_businesses b
                    ON b.id = f.business_id

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
                    error: "Formulario no encontrado"
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

        const positiveThreshold =
            toNumber(
                form.positive_threshold,
                4
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
        // SUMMARY BASE
        // Importante:
        // Se filtra por form_id + business_id + qr_code_id
        // para no mezclar datos de otros clientes.
        // =====================================

        const [[baseSummary]] =
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
                    ) AS google_clicks,

                    SUM(
                        CASE
                            WHEN google_prompt_shown = 1 THEN 1
                            ELSE 0
                        END
                    ) AS google_prompt_shown,

                    SUM(
                        CASE
                            WHEN average_rating >= ? THEN 1
                            ELSE 0
                        END
                    ) AS positive_responses,

                    SUM(
                        CASE
                            WHEN average_rating < ? THEN 1
                            ELSE 0
                        END
                    ) AS private_feedback_responses

                FROM tags_client_review_responses
                WHERE form_id = ?
                AND business_id = ?
                AND qr_code_id = ?
                `,
                [
                    positiveThreshold,
                    positiveThreshold,
                    form.id,
                    businessId,
                    qrCodeId
                ]
            );

        const totalResponses =
            toNumber(
                baseSummary?.total_responses
            );

        const googlePromptShown =
            toNumber(
                baseSummary?.google_prompt_shown
            );

        const googleClicks =
            toNumber(
                baseSummary?.google_clicks
            );

        const googleConversionRate =
            googlePromptShown > 0
                ? Math.round(
                    (googleClicks / googlePromptShown) * 100
                )
                : 0;

        // =====================================
        // RATINGS DISTRIBUTION
        // Cuenta reseñas finales, no respuestas por pregunta.
        // Total debe coincidir con total_responses.
        // =====================================

        const [ratingRows] =
            await db.query(
                `
        SELECT
            ROUND(average_rating) AS rating,
            COUNT(*) AS total
        FROM tags_client_review_responses
        WHERE form_id = ?
        AND business_id = ?
        AND qr_code_id = ?
        AND average_rating IS NOT NULL
        GROUP BY ROUND(average_rating)
        ORDER BY rating DESC
        `,
                [
                    form.id,
                    businessId,
                    qrCodeId
                ]
            );

        const ratings = {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0
        };

        ratingRows.forEach(row => {
            const rating =
                Math.max(
                    1,
                    Math.min(
                        5,
                        toNumber(row.rating)
                    )
                );

            ratings[rating] =
                toNumber(row.total);
        });
        // =====================================
        // LAST 30 DAYS
        // =====================================

        const [last30DaysRows] =
            await db.query(
                `
                SELECT
                    DATE(created_at) AS date,
                    COUNT(*) AS total,
                    AVG(average_rating) AS average
                FROM tags_client_review_responses
                WHERE form_id = ?
                AND business_id = ?
                AND qr_code_id = ?
                AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY DATE(created_at) ASC
                `,
                [
                    form.id,
                    businessId,
                    qrCodeId
                ]
            );

        const last30Days =
            last30DaysRows.map(row => ({
                date:
                    row.date,

                total:
                    toNumber(
                        row.total
                    ),

                average:
                    toNumber(
                        row.average
                    )
            }));

        // =====================================
        // LATEST RESPONSES
        // Comentarios desde general_comment o answers.comment.
        // =====================================

        const [latestResponses] =
            await db.query(
                `
                SELECT
                    r.id,
                    r.customer_name,
                    r.customer_email,
                    r.average_rating,
                    r.general_comment,
                    r.google_prompt_shown,
                    r.google_clicked,
                    r.status,
                    r.created_at,

                    GROUP_CONCAT(
                        NULLIF(a.comment, '')
                        ORDER BY a.id ASC
                        SEPARATOR ' / '
                    ) AS answers_comment

                FROM tags_client_review_responses r

                LEFT JOIN tags_client_review_answers a
                    ON a.response_id = r.id
                    AND a.form_id = r.form_id

                WHERE r.form_id = ?
                AND r.business_id = ?
                AND r.qr_code_id = ?

                GROUP BY
                    r.id,
                    r.customer_name,
                    r.customer_email,
                    r.average_rating,
                    r.general_comment,
                    r.google_prompt_shown,
                    r.google_clicked,
                    r.status,
                    r.created_at

                ORDER BY r.created_at DESC

                LIMIT 5
                `,
                [
                    form.id,
                    businessId,
                    qrCodeId
                ]
            );

        const normalizedLatestResponses =
            latestResponses.map(response => ({
                ...response,

                general_comment:
                    response.general_comment ||
                    response.answers_comment ||
                    ""
            }));

        // =====================================
        // SUMMARY FINAL
        // =====================================

        const summary = {
            total_responses:
                totalResponses,

            average_rating:
                baseSummary?.average_rating
                    ? toNumber(
                        baseSummary.average_rating
                    )
                    : null,

            google_clicks:
                googleClicks,

            google_prompt_shown:
                googlePromptShown,

            positive_responses:
                toNumber(
                    baseSummary?.positive_responses
                ),

            private_feedback_responses:
                toNumber(
                    baseSummary?.private_feedback_responses
                ),

            ratings,

            google: {
                prompt_shown:
                    googlePromptShown,

                clicked:
                    googleClicks,

                conversion_rate:
                    googleConversionRate
            },

            last_30_days:
                last30Days,

            latest_responses:
                normalizedLatestResponses
        };

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
