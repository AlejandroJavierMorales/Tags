// =====================================
// API: /api/client-reviews/admin/responses/list
// Descripción: Lista y filtra respuestas de ClientsReviews para el panel administrativo.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        const formId =
            searchParams.get("formId");

        const status =
            searchParams.get("status") || "";

        const rating =
            searchParams.get("rating") || "";

        const verified =
            searchParams.get("verified") || "";

        const isPublic =
            searchParams.get("isPublic") || "";

        const from =
            searchParams.get("from") || "";

        const to =
            searchParams.get("to") || "";

        const q =
            searchParams.get("q") || "";

        const page =
            Number(searchParams.get("page") || 1);

        const limit =
            Number(searchParams.get("limit") || 20);

        const offset =
            (page - 1) * limit;

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
                { status: 400 }
            );
        }

        const where = [
            "r.business_id = ?"
        ];

        const params = [
            businessId
        ];

        if (formId) {
            where.push("r.form_id = ?");
            params.push(formId);
        }

        if (status) {
            where.push("r.status = ?");
            params.push(status);
        }

        if (rating) {
            where.push("ROUND(r.average_rating) = ?");
            params.push(Number(rating));
        }

        if (verified === "verified") {
            where.push("r.verified_purchase = 1");
        }

        if (verified === "unverified") {
            where.push("r.verified_purchase = 0");
        }

        if (isPublic === "public") {
            where.push("r.is_public = 1");
        }

        if (isPublic === "private") {
            where.push("r.is_public = 0");
        }

        if (from) {
            where.push("DATE(r.created_at) >= ?");
            params.push(from);
        }

        if (to) {
            where.push("DATE(r.created_at) <= ?");
            params.push(to);
        }

        if (q) {
            where.push(`
                (
                    r.customer_name LIKE ?
                    OR r.customer_email LIKE ?
                    OR r.customer_phone LIKE ?
                    OR r.general_comment LIKE ?
                )
            `);

            params.push(
                `%${q}%`,
                `%${q}%`,
                `%${q}%`,
                `%${q}%`
            );
        }

        const whereSQL =
            `WHERE ${where.join(" AND ")}`;

        const [[{ total }]] =
            await db.query(
                `
                SELECT COUNT(DISTINCT r.id) AS total
                FROM tags_client_review_responses r
                ${whereSQL}
                `,
                params
            );

        const [rows] =
            await db.query(
                `
                SELECT
                    r.id,
                    r.form_id,
                    r.business_id,
                    r.qr_code_id,
                    r.page_id,
                    r.customer_name,
                    r.customer_email,
                    r.customer_phone,
                    r.general_comment,
                    r.average_rating,
                    r.min_rating,
                    r.max_rating,
                    r.google_prompt_shown,
                    r.google_clicked,
                    r.status,
                    r.verified_purchase,
                    r.is_public,
                    r.store_id,
                    r.order_id,
                    r.created_at,

                    q.code AS qr_code,
                    q.label AS qr_label,

                    p.slug AS page_slug,

                    COUNT(DISTINCT m.id) AS media_count

                FROM tags_client_review_responses r

                LEFT JOIN tags_qr_codes q
                    ON q.id = r.qr_code_id

                LEFT JOIN tags_qr_pages p
                    ON p.id = r.page_id

                LEFT JOIN tags_client_review_media m
                    ON m.response_id = r.id
                    AND m.uploaded_by = 'reviewer'
                    AND m.is_active = 1

                ${whereSQL}

                GROUP BY
                    r.id,
                    r.form_id,
                    r.business_id,
                    r.qr_code_id,
                    r.page_id,
                    r.customer_name,
                    r.customer_email,
                    r.customer_phone,
                    r.general_comment,
                    r.average_rating,
                    r.min_rating,
                    r.max_rating,
                    r.google_prompt_shown,
                    r.google_clicked,
                    r.status,
                    r.verified_purchase,
                    r.is_public,
                    r.store_id,
                    r.order_id,
                    r.created_at,
                    q.code,
                    q.label,
                    p.slug

                ORDER BY r.created_at DESC

                LIMIT ${limit}
                OFFSET ${offset}
                `,
                params
            );

        return Response.json({
            ok: true,
            data: rows,
            total,
            page,
            pages: Math.ceil(total / limit)
        });

    } catch (err) {
        console.error(
            "CLIENT REVIEWS RESPONSES LIST ERROR:",
            err
        );

        return Response.json(
            { error: "Error listando reseñas" },
            { status: 500 }
        );
    }
}