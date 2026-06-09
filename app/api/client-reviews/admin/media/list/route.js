// =====================================
// API: /api/client-reviews/admin/media/list
// Descripción: Lista imágenes de ClientsReviews.
// Puede listar galería del negocio o imágenes asociadas a una reseña.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const businessId = searchParams.get("businessId");
        const formId = searchParams.get("formId");
        const responseId = searchParams.get("responseId") || "";
        const uploadedBy = searchParams.get("uploadedBy") || "";

        if (!businessId || !formId) {
            return Response.json(
                { error: "businessId y formId requeridos" },
                { status: 400 }
            );
        }

        const where = [
            "business_id = ?",
            "form_id = ?",
            "is_active = 1"
        ];

        const params = [
            businessId,
            formId
        ];

        if (responseId) {
            where.push("response_id = ?");
            params.push(responseId);
        }

        if (uploadedBy) {
            where.push("uploaded_by = ?");
            params.push(uploadedBy);
        }

        const [rows] = await db.query(
            `
            SELECT
                id,
                response_id,
                uploaded_by,
                type,
                url,
                original_filename,
                width,
                height,
                size_bytes,
                created_at
            FROM tags_client_review_media
            WHERE ${where.join(" AND ")}
            ORDER BY id DESC
            `,
            params
        );

        return Response.json({
            ok: true,
            data: rows
        });

    } catch (err) {
        console.error("CLIENT REVIEWS MEDIA LIST ERROR:", err);

        return Response.json(
            { error: "Error listando imágenes" },
            { status: 500 }
        );
    }
}