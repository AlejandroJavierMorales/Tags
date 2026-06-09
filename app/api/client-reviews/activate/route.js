// =====================================
// API: /api/client-reviews/activate
// Descripción: Activa ClientsReviews para un QR, crea QR-Page especializada,
// formulario base, preguntas default, registra addon usage y setea final_url.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { createSlug } from "@/app/modules/qr-page/lib/createSlug";
import { registerQRAddonUsage } from "@/app/modules/addons/lib/registerQRAddonUsage";

function getBaseUrl() {
    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL;
}

const defaultQuestions = [
    {
        question_text: "¿Cómo calificás tu experiencia general?",
        helper_text: "Tu opinión nos ayuda a mejorar.",
        sort_order: 1
    },
    {
        question_text: "¿Cómo calificás la atención recibida?",
        helper_text: "Queremos saber cómo fue el trato.",
        sort_order: 2
    },
    {
        question_text: "¿Cómo calificás la calidad del producto o servicio?",
        helper_text: "Contanos si cumplimos tus expectativas.",
        sort_order: 3
    }
];

export async function POST(req) {
    const conn = await db.getConnection();

    try {
        const {
            businessId,
            qrCodeId,
            slug
        } = await req.json();

        if (!businessId || !qrCodeId || !slug) {
            return Response.json(
                { error: "businessId, qrCodeId y slug son requeridos" },
                { status: 400 }
            );
        }

        const cleanSlug = createSlug(slug);

        if (!cleanSlug) {
            return Response.json(
                { error: "Slug inválido" },
                { status: 400 }
            );
        }

        const [qrRows] = await conn.query(
            `
            SELECT *
            FROM tags_qr_codes
            WHERE id = ?
            AND business_id = ?
            LIMIT 1
            `,
            [qrCodeId, businessId]
        );

        const qr = qrRows[0];

        if (!qr) {
            return Response.json(
                { error: "QR no encontrado para este cliente" },
                { status: 404 }
            );
        }

        const [existingPageRows] = await conn.query(
            `
            SELECT id
            FROM tags_qr_pages
            WHERE qr_code_id = ?
            LIMIT 1
            `,
            [qrCodeId]
        );

        if (existingPageRows.length) {
            return Response.json(
                { error: "Este QR ya tiene una página asociada" },
                { status: 409 }
            );
        }

        const [slugRows] = await conn.query(
            `
            SELECT id
            FROM tags_qr_pages
            WHERE slug = ?
            LIMIT 1
            `,
            [cleanSlug]
        );

        if (slugRows.length) {
            return Response.json(
                { error: "Ese slug ya está en uso" },
                { status: 409 }
            );
        }

        await conn.beginTransaction();

        const [pageResult] = await conn.query(
            `
            INSERT INTO tags_qr_pages (
                business_id,
                qr_code_id,
                page_type,
                schema_type,
                slug,
                slug_locked,
                title,
                description,
                status,
                global_styles,
                header_config,
                footer_config,
                seo_title,
                seo_description,
                created_at,
                updated_at
            )
            VALUES (?, ?, 'client_reviews', 'review_form', ?, 1, ?, ?, 'published', ?, ?, ?, ?, ?, NOW(), NOW())
            `,
            [
                businessId,
                qrCodeId,
                cleanSlug,
                "¿Cómo fue tu experiencia?",
                "Dejanos tu opinión para ayudarnos a mejorar.",
                JSON.stringify({}),
                JSON.stringify({}),
                JSON.stringify({}),
                "¿Cómo fue tu experiencia?",
                "Dejanos tu opinión para ayudarnos a mejorar."
            ]
        );

        const pageId = pageResult.insertId;

        const [formResult] = await conn.query(
            `
            INSERT INTO tags_client_review_forms (
                business_id,
                qr_code_id,
                page_id,
                title,
                subtitle,
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
            )
            VALUES (?, ?, ?, ?, ?, 4, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            `,
            [
                businessId,
                qrCodeId,
                pageId,
                "¿Cómo fue tu experiencia?",
                "Tu opinión nos ayuda a mejorar nuestro servicio.",
                "¡Gracias por tu opinión!",
                "Valoramos mucho que te hayas tomado un momento para responder.",
                "¿Nos ayudás compartiendo tu experiencia en Google?",
                "Tu reseña pública ayuda a que más personas nos conozcan.",
                "Dejar reseña en Google",
                "Gracias por contarnos cómo podemos mejorar",
                "Vamos a revisar tu comentario para seguir mejorando.",
                JSON.stringify({}),
                JSON.stringify({})
            ]
        );

        const formId = formResult.insertId;

        for (const question of defaultQuestions) {
            await conn.query(
                `
                INSERT INTO tags_client_review_questions (
                    form_id,
                    question_text,
                    helper_text,
                    sort_order
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    formId,
                    question.question_text,
                    question.helper_text,
                    question.sort_order
                ]
            );
        }

        const finalUrl = `${getBaseUrl()}/p/${cleanSlug}`;

        await conn.query(
            `
            UPDATE tags_qr_codes
            SET
                status = 'active',
                final_url = ?,
                has_qr_page = 1
            WHERE id = ?
            AND business_id = ?
            `,
            [
                finalUrl,
                qrCodeId,
                businessId
            ]
        );

        await registerQRAddonUsage({
            conn,
            qrCodeId,
            businessId,
            addonCode: "client_reviews",
            sourceTable: "tags_client_review_forms",
            sourceId: formId
        });

        await conn.commit();

        return Response.json({
            ok: true,
            pageId,
            formId,
            slug: cleanSlug,
            publicUrl: finalUrl
        });

    } catch (err) {
        await conn.rollback();

        console.error("CLIENT REVIEWS ACTIVATE ERROR:", err);

        return Response.json(
            { error: err.message || "Error activando ClientsReviews" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}