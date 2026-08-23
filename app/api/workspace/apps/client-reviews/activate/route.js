// =====================================
// API: /api/workspace/apps/client-reviews/activate
// Descripción: Activa Tags Reviews desde el Workspace creando QR digital automático.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getRequestBaseUrl } from "@/app/lib/channelContext";
import { createSlug } from "@/app/modules/qr-page/lib/createSlug";
import { registerQRAddonUsage } from "@/app/modules/addons/lib/registerQRAddonUsage";
import { createAppQRCode } from "@/app/modules/qr/lib/createAppQRCode";

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
            name,
            title,
            slug
        } = await req.json();

        const finalTitle =
            title || name || "¿Cómo fue tu experiencia?";

        if (!businessId || !finalTitle || !slug) {
            return Response.json(
                { error: "businessId, nombre y slug son requeridos" },
                { status: 400 }
            );
        }

        const cleanSlug =
            createSlug(slug);

        if (!cleanSlug) {
            return Response.json(
                { error: "Slug inválido" },
                { status: 400 }
            );
        }

        const [businessRows] = await conn.query(
            `
            SELECT *
            FROM tags_businesses
            WHERE id = ?
            LIMIT 1
            `,
            [businessId]
        );

        const business =
            businessRows[0];

        if (!business) {
            return Response.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        const [addonRows] = await conn.query(
            `
            SELECT id
            FROM tags_business_addons
            WHERE business_id = ?
            AND addon_code = 'client_reviews'
            AND status = 'active'
            AND (
                expires_at IS NULL
                OR expires_at >= NOW()
            )
            LIMIT 1
            `,
            [businessId]
        );

        if (!addonRows.length) {
            return Response.json(
                { error: "El cliente no tiene Tags Reviews activo" },
                { status: 403 }
            );
        }

        const [existingRows] = await conn.query(
            `
            SELECT id
            FROM tags_qr_pages
            WHERE business_id = ?
            AND page_type = 'client_reviews'
            LIMIT 1
            `,
            [businessId]
        );

        if (existingRows.length) {
            return Response.json(
                { error: "Este cliente ya tiene Tags Reviews creado" },
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
                { error: "Ese nombre público ya está en uso" },
                { status: 409 }
            );
        }

        await conn.beginTransaction();

        const publicUrl =
            `${getRequestBaseUrl(req)}/p/${cleanSlug}`;

        const qr =
            await createAppQRCode({
                conn,
                businessId,
                label: finalTitle,
                value: publicUrl,
                finalUrl: publicUrl,
                status: "active"
            });

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
                qr.id,
                cleanSlug,
                finalTitle,
                "Dejanos tu opinión para ayudarnos a mejorar.",
                JSON.stringify({}),
                JSON.stringify({}),
                JSON.stringify({}),
                finalTitle,
                "Dejanos tu opinión para ayudarnos a mejorar."
            ]
        );

        const pageId =
            pageResult.insertId;

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
                qr.id,
                pageId,
                finalTitle,
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

        const formId =
            formResult.insertId;

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

        await registerQRAddonUsage({
            conn,
            qrCodeId: qr.id,
            businessId,
            addonCode: "client_reviews",
            sourceTable: "tags_client_review_forms",
            sourceId: formId
        });

        await conn.query(
            `
            UPDATE tags_qr_codes
            SET has_qr_page = 1
            WHERE id = ?
            AND business_id = ?
            `,
            [qr.id, businessId]
        );

        await conn.commit();

        return Response.json({
            ok: true,
            qrId: qr.id,
            qrCode: qr.code,
            pageId,
            formId,
            slug: cleanSlug,
            publicUrl
        });

    } catch (err) {
        await conn.rollback();

        console.error(
            "WORKSPACE CLIENT REVIEWS ACTIVATE ERROR:",
            err
        );

        return Response.json(
            { error: err.message || "Error activando Tags Reviews" },
            { status: err.status || 500 }
        );

    } finally {
        conn.release();
    }
}
