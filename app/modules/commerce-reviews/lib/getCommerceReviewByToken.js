// =====================================
// Archivo:
// /app/modules/commerce-reviews/lib/getCommerceReviewByToken.js
//
// Descripción:
// Obtiene los datos públicos de Commerce Reviews
// a partir del slug y token de una operación entregada.
// Incluye el formulario activo completo de Tags Reviews,
// con todas sus preguntas visibles.
//
// Contexto:
// commerce-reviews
// =====================================

import { db }
    from "@/app/lib/tags-db";

function safeParse(
    value,
    fallback = {}
) {

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

export async function getCommerceReviewByToken({
    slug,
    token
}) {

    if (!slug || !token) {
        return null;
    }

    const [orderRows] =
        await db.query(
            `
            SELECT
                o.id,
                o.store_id,
                o.order_number,
                o.customer_name,
                o.customer_email,
                o.customer_phone,
                o.shipping_status,
                o.review_token,
                o.created_at,

                s.business_id,
                s.name AS store_name,
                s.slug AS store_slug,
                s.logo_url AS store_logo_url,
                s.description AS store_description,
                s.styles_json AS store_styles_json,
                s.settings_json AS store_settings_json,

                qrp.theme_id,

                t.code AS theme_code,
                t.name AS theme_name,
                t.css_tokens AS theme_css_tokens

            FROM tags_store_orders o

            INNER JOIN tags_stores s
                ON s.id = o.store_id

            INNER JOIN tags_qr_pages qrp
                ON qrp.id = s.page_id

            LEFT JOIN tags_qr_page_themes t
                ON t.id = qrp.theme_id

            WHERE o.review_token = ?
            AND o.shipping_status = 'delivered'
            AND s.slug = ?
            AND s.status = 'published'
            AND qrp.status = 'published'

            LIMIT 1
            `,
            [
                token,
                slug
            ]
        );

    const order =
        orderRows?.[0];

    if (!order) {
        return null;
    }

    const [itemRows] =
        await db.query(
            `
            SELECT
                oi.id AS order_item_id,
                oi.product_id,
                oi.variant_id,
                oi.title,
                oi.variant_title,
                oi.quantity,

                p.slug AS product_slug,

                img.image_url

            FROM tags_store_order_items oi

            LEFT JOIN tags_store_products p
                ON p.id = oi.product_id

            LEFT JOIN tags_store_product_images img
                ON img.product_id = oi.product_id
                AND img.is_primary = 1

            WHERE oi.order_id = ?

            ORDER BY oi.id ASC
            `,
            [
                order.id
            ]
        );

    const [reviewRows] =
        await db.query(
            `
            SELECT
                id,
                source_item_id,
                item_id,
                rating,
                title,
                comment,
                status,
                is_verified,
                created_at

            FROM tags_commerce_item_reviews

            WHERE business_id = ?
            AND source_type = 'store_order'
            AND source_id = ?
            AND item_type = 'store_product'

            ORDER BY id ASC
            `,
            [
                order.business_id,
                order.id
            ]
        );

    const reviewsByProduct =
        new Map(
            (reviewRows || []).map(
                review => [
                    Number(
                        review.item_id
                    ),
                    review
                ]
            )
        );

    const themeTokens =
        safeParse(
            order.theme_css_tokens
        );

    const storeStyles =
        safeParse(
            order.store_styles_json
        );

    const customTokens =
        safeParse(
            storeStyles?.css_tokens
        );

    // =====================================
    // TAGS REVIEWS
    // =====================================

    const [formRows] =
        await db.query(
            `
            SELECT
                id,
                business_id,
                qr_code_id,
                page_id,
                title,
                subtitle,
                logo_url,
                theme_id,
                google_review_url,
                positive_threshold,
                success_title,
                success_message,
                google_cta_title,
                google_cta_text,
                google_cta_button_label,
                private_feedback_title,
                private_feedback_text,
                styles_json,
                settings_json,
                status

            FROM tags_client_review_forms

            WHERE business_id = ?
            AND status = 'active'

            ORDER BY id ASC

            LIMIT 1
            `,
            [
                order.business_id
            ]
        );

    const tagsReviewForm =
        formRows?.[0] || null;

    let tagsReviewQuestions =
        [];

    if (tagsReviewForm) {

        const [questionRows] =
            await db.query(
                `
                SELECT
                    id,
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

                FROM tags_client_review_questions

                WHERE form_id = ?
                AND is_visible = 1

                ORDER BY
                    sort_order ASC,
                    id ASC
                `,
                [
                    tagsReviewForm.id
                ]
            );

        tagsReviewQuestions =
            (questionRows || []).map(
                question => ({
                    ...question,

                    styles_json:
                        safeParse(
                            question.styles_json
                        ),

                    settings_json:
                        safeParse(
                            question.settings_json
                        )
                })
            );

    }

    const tagsReviewsConfig =
        tagsReviewForm &&
        tagsReviewQuestions.length > 0
            ? {
                enabled: true,

                form: {
                    ...tagsReviewForm,

                    styles_json:
                        safeParse(
                            tagsReviewForm.styles_json
                        ),

                    settings_json:
                        safeParse(
                            tagsReviewForm.settings_json
                        )
                },

                questions:
                    tagsReviewQuestions
            }
            : {
                enabled: false,
                form: null,
                questions: []
            };

    return {
        store: {
            id:
                order.store_id,

            business_id:
                order.business_id,

            name:
                order.store_name,

            slug:
                order.store_slug,

            logo_url:
                order.store_logo_url,

            description:
                order.store_description,

            settings_json:
                safeParse(
                    order.store_settings_json
                ),

            styles_json:
                storeStyles,

            theme_id:
                order.theme_id,

            theme_code:
                order.theme_code,

            theme_name:
                order.theme_name,

            theme_css_vars: {
                ...themeTokens,
                ...customTokens
            }
        },

        order: {
            id:
                order.id,

            order_number:
                order.order_number,

            customer_name:
                order.customer_name,

            customer_email:
                order.customer_email,

            customer_phone:
                order.customer_phone,

            created_at:
                order.created_at
        },

        items:
            (itemRows || []).map(
                item => ({
                    order_item_id:
                        item.order_item_id,

                    product_id:
                        item.product_id,

                    variant_id:
                        item.variant_id,

                    title:
                        item.title,

                    variant_title:
                        item.variant_title,

                    quantity:
                        Number(
                            item.quantity || 1
                        ),

                    image_url:
                        item.image_url || null,

                    review:
                        reviewsByProduct.get(
                            Number(
                                item.product_id
                            )
                        ) || null
                })
            ),

        tagsReviewsConfig
    };

}