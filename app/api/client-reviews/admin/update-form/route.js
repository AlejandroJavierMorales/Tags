// =====================================
// API: /api/client-reviews/admin/update-form
// Descripción: Actualiza configuración general, textos, logo y theme de ClientsReviews.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function safeJson(value) {
    if (!value) {
        return JSON.stringify({});
    }

    if (typeof value === "string") {
        try {
            JSON.parse(value);
            return value;
        } catch {
            return JSON.stringify({});
        }
    }

    return JSON.stringify(value);
}

export async function POST(req) {

    try {

        const body =
            await req.json();

        const {
            formId,
            businessId,

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
            settings_json
        } = body;

        if (!formId || !businessId) {
            return Response.json(
                {
                    error:
                        "formId y businessId son requeridos"
                },
                {
                    status: 400
                }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT id
                FROM tags_client_review_forms
                WHERE id = ?
                AND business_id = ?
                LIMIT 1
                `,
                [
                    formId,
                    businessId
                ]
            );

        if (!rows.length) {
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

        let finalThemeId =
            theme_id || null;

        if (finalThemeId) {
            const [themeRows] =
                await db.query(
                    `
                    SELECT id
                    FROM tags_qr_page_themes
                    WHERE id = ?
                    AND is_active = 1
                    LIMIT 1
                    `,
                    [
                        finalThemeId
                    ]
                );

            if (!themeRows.length) {
                return Response.json(
                    {
                        error:
                            "Theme inválido o inactivo"
                    },
                    {
                        status: 400
                    }
                );
            }
        }

        await db.query(
            `
            UPDATE tags_client_review_forms
            SET
                title = ?,
                subtitle = ?,
                logo_url = ?,

                theme_id = ?,

                google_review_url = ?,
                positive_threshold = ?,

                success_title = ?,
                success_message = ?,

                google_cta_title = ?,
                google_cta_text = ?,
                google_cta_button_label = ?,

                private_feedback_title = ?,
                private_feedback_text = ?,

                styles_json = ?,
                settings_json = ?,

                updated_at = NOW()
            WHERE id = ?
            AND business_id = ?
            `,
            [
                title || null,
                subtitle || null,
                logo_url || null,

                finalThemeId,

                google_review_url || null,
                Number(positive_threshold || 4),

                success_title || null,
                success_message || null,

                google_cta_title || null,
                google_cta_text || null,
                google_cta_button_label || null,

                private_feedback_title || null,
                private_feedback_text || null,

                safeJson(styles_json),
                safeJson(settings_json),

                formId,
                businessId
            ]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.error(
            "CLIENT REVIEWS UPDATE FORM ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error actualizando configuración"
            },
            {
                status: 500
            }
        );
    }
}