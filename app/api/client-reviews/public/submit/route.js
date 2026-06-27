// =====================================
// API: /api/client-reviews/public/submit
// Descripción: Guarda una respuesta pública de ClientsReviews y sus calificaciones.
// Soporta reseñas comunes y reseñas verificadas desde Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { db } from "@/app/lib/tags-db";

function hashIP(ip) {
    if (!ip) return null;

    return crypto
        .createHash("sha256")
        .update(ip)
        .digest("hex");
}

function clean(value) {
    return String(value || "").trim();
}

export async function POST(req) {
    const conn = await db.getConnection();

    try {
        const body = await req.json();

        const {
            formId,
            customer_name = null,
            customer_email = null,
            customer_phone = null,
            general_comment = null,
            answers = [],
            reviewToken = null
        } = body;

        if (!formId) {
            return Response.json(
                { error: "formId requerido" },
                { status: 400 }
            );
        }

        if (!Array.isArray(answers) || answers.length === 0) {
            return Response.json(
                { error: "Debe enviar al menos una respuesta" },
                { status: 400 }
            );
        }

        const [formRows] = await conn.query(
            `
            SELECT *
            FROM tags_client_review_forms
            WHERE id = ?
            AND status = 'active'
            LIMIT 1
            `,
            [formId]
        );

        const form = formRows[0];

        if (!form) {
            return Response.json(
                { error: "Formulario no encontrado" },
                { status: 404 }
            );
        }

        let verifiedPurchase = 0;
        let storeId = null;
        let orderId = null;
        let reviewTokenId = null;

        const cleanReviewToken =
            clean(reviewToken);

        if (cleanReviewToken) {
            const [tokenRows] = await conn.query(
                `
                SELECT
                    t.id,
                    t.store_id,
                    t.order_id,
                    t.used_at,
                    t.expires_at,
                    s.business_id
                FROM tags_store_review_tokens t

                INNER JOIN tags_stores s
                    ON s.id = t.store_id

                WHERE t.token = ?
                AND t.used_at IS NULL
                AND t.expires_at > NOW()
                LIMIT 1
                `,
                [cleanReviewToken]
            );

            const tokenRow =
                tokenRows[0];

            if (!tokenRow) {
                return Response.json(
                    {
                        error:
                            "El enlace de reseña verificada no es válido o ya fue usado."
                    },
                    { status: 403 }
                );
            }

            if (
                Number(tokenRow.business_id) !==
                Number(form.business_id)
            ) {
                return Response.json(
                    {
                        error:
                            "El enlace de reseña no pertenece a este negocio."
                    },
                    { status: 403 }
                );
            }

            verifiedPurchase = 1;
            storeId = tokenRow.store_id;
            orderId = tokenRow.order_id;
            reviewTokenId = tokenRow.id;
        }

        const ratings = answers
            .map(a => Number(a.rating))
            .filter(v => v >= 1 && v <= 5);

        if (ratings.length !== answers.length) {
            return Response.json(
                { error: "Todas las calificaciones deben estar entre 1 y 5" },
                { status: 400 }
            );
        }

        const total = ratings.reduce((acc, n) => acc + n, 0);
        const average = Number((total / ratings.length).toFixed(2));
        const minRating = Math.min(...ratings);
        const maxRating = Math.max(...ratings);

        const positiveThreshold =
            Number(form.positive_threshold || 4);

        const googlePromptShown =
            average >= positiveThreshold ? 1 : 0;

        const ip =
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            null;

        const userAgent =
            req.headers.get("user-agent") || null;

        /* Existe ya una Reseña para este Pedido? */
        const [existingReviewRows] =
            await conn.query(
                `
        SELECT id
        FROM tags_client_review_responses
        WHERE store_id = ?
        AND order_id = ?
        AND verified_purchase = 1
        LIMIT 1
        `,
                [
                    tokenRow.store_id,
                    tokenRow.order_id
                ]
            );

        if (existingReviewRows.length > 0) {
            return Response.json(
                {
                    error:
                        "Esta compra ya fue calificada."
                },
                {
                    status: 409
                }
            );
        }

        await conn.beginTransaction();

        const [responseResult] = await conn.query(
            `
            INSERT INTO tags_client_review_responses (
                form_id,
                business_id,
                qr_code_id,
                page_id,
                customer_name,
                customer_email,
                customer_phone,
                general_comment,
                average_rating,
                min_rating,
                max_rating,
                google_prompt_shown,
                source,
                user_agent,
                ip_hash,
                status,
                verified_purchase,
                store_id,
                order_id,
                review_token_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?)
            `,
            [
                form.id,
                form.business_id,
                form.qr_code_id,
                form.page_id,
                customer_name,
                customer_email,
                customer_phone,
                general_comment,
                average,
                minRating,
                maxRating,
                googlePromptShown,
                verifiedPurchase ? "store_verified_purchase" : "qr",
                userAgent,
                hashIP(ip),
                verifiedPurchase,
                storeId,
                orderId,
                reviewTokenId
            ]
        );

        const responseId = responseResult.insertId;

        for (const answer of answers) {
            await conn.query(
                `
                INSERT INTO tags_client_review_answers (
                    response_id,
                    form_id,
                    question_id,
                    rating,
                    comment
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    responseId,
                    form.id,
                    answer.question_id,
                    Number(answer.rating),
                    answer.comment || null
                ]
            );
        }

        if (reviewTokenId) {
            await conn.query(
                `
                UPDATE tags_store_review_tokens
                SET used_at = NOW(),
                    updated_at = NOW()
                WHERE id = ?
                AND used_at IS NULL
                `,
                [reviewTokenId]
            );
        }

        await conn.commit();

        return Response.json({
            ok: true,
            responseId,
            averageRating: average,
            googlePromptShown: Boolean(googlePromptShown),
            googleReviewUrl: form.google_review_url || null,
            verifiedPurchase: Boolean(verifiedPurchase)
        });

    } catch (err) {
        await conn.rollback();

        console.error("CLIENT REVIEWS SUBMIT ERROR:", err);

        return Response.json(
            { error: "Error enviando reseña" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}