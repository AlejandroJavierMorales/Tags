// =====================================
// API: /api/client-reviews/admin/media/delete
// Descripción: Elimina/desactiva una imagen de ClientsReviews.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import { bucket }
    from "@/app/modules/files/lib/googleStorage";

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            id,
            businessId
        } = body;

        if (!id || !businessId) {
            return Response.json(
                { error: "id y businessId requeridos" },
                { status: 400 }
            );
        }

        const [rows] =
            await db.query(
                `
                SELECT
                    id,
                    storage_path
                FROM tags_client_review_media
                WHERE id = ?
                AND business_id = ?
                LIMIT 1
                `,
                [
                    id,
                    businessId
                ]
            );

        const media =
            rows[0];

        if (!media) {
            return Response.json(
                { error: "Imagen no encontrada" },
                { status: 404 }
            );
        }

        if (media.storage_path) {
            await bucket
                .file(media.storage_path)
                .delete({
                    ignoreNotFound: true
                })
                .catch(() => null);
        }

        await db.query(
            `
            UPDATE tags_client_review_media
            SET
                is_active = 0,
                updated_at = NOW()
            WHERE id = ?
            AND business_id = ?
            `,
            [
                id,
                businessId
            ]
        );

        return Response.json({
            ok: true
        });

    } catch (err) {
        console.error(
            "CLIENT REVIEWS MEDIA DELETE ERROR:",
            err
        );

        return Response.json(
            { error: "Error eliminando imagen" },
            { status: 500 }
        );
    }
}