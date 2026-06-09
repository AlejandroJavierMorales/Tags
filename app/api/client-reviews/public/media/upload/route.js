// =====================================
// API: /api/client-reviews/public/media/upload
// Descripción: Sube imágenes del cliente final asociadas a una respuesta.
// Optimiza a WEBP máximo 900px.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import sharp from "sharp";

import { db }
    from "@/app/lib/tags-db";

import { bucket }
    from "@/app/modules/files/lib/googleStorage";

const bucketName =
    process.env.GOOGLE_STORAGE_BUCKET;

function cleanFilename(name) {
    return String(name || "imagen")
        .replace(/\.[^/.]+$/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_]/g, "")
        .toLowerCase();
}

export async function POST(req) {

    try {

        if (!bucketName) {
            return Response.json(
                { error: "GOOGLE_STORAGE_BUCKET no configurado" },
                { status: 500 }
            );
        }

        const formData =
            await req.formData();

        const responseId =
            formData.get("responseId");

        const file =
            formData.get("file");

        if (!responseId) {
            return Response.json(
                { error: "responseId requerido" },
                { status: 400 }
            );
        }

        if (!file) {
            return Response.json(
                { error: "Archivo requerido" },
                { status: 400 }
            );
        }

        if (!String(file.type || "").startsWith("image/")) {
            return Response.json(
                { error: "Solo se permiten imágenes" },
                { status: 400 }
            );
        }

        const [responseRows] =
            await db.query(
                `
                SELECT
                    id,
                    form_id,
                    business_id,
                    qr_code_id
                FROM tags_client_review_responses
                WHERE id = ?
                LIMIT 1
                `,
                [responseId]
            );

        const response =
            responseRows[0];

        if (!response) {
            return Response.json(
                { error: "Respuesta no encontrada" },
                { status: 404 }
            );
        }

        const buffer =
            Buffer.from(
                await file.arrayBuffer()
            );

        const optimizedBuffer =
            await sharp(buffer)
                .rotate()
                .resize({
                    width: 900,
                    height: 900,
                    fit: "inside",
                    withoutEnlargement: true
                })
                .webp({
                    quality: 82
                })
                .toBuffer();

        const finalMetadata =
            await sharp(optimizedBuffer)
                .metadata();

        const filename =
            `${Date.now()}-${cleanFilename(file.name)}.webp`;

        const storagePath =
            `client-reviews/${response.business_id}/${response.form_id}/reviewer/${response.id}/${filename}`;

        await bucket
            .file(storagePath)
            .save(
                optimizedBuffer,
                {
                    metadata: {
                        contentType:
                            "image/webp"
                    }
                }
            );

        const publicUrl =
            `https://storage.googleapis.com/${bucketName}/${storagePath}`;

        const [result] =
            await db.query(
                `
                INSERT INTO tags_client_review_media (
                    business_id,
                    form_id,
                    response_id,
                    uploaded_by,
                    type,
                    url,
                    storage_path,
                    original_filename,
                    width,
                    height,
                    size_bytes,
                    created_at
                )
                VALUES (?, ?, ?, 'reviewer', 'social_image', ?, ?, ?, ?, ?, ?, NOW())
                `,
                [
                    response.business_id,
                    response.form_id,
                    response.id,
                    publicUrl,
                    storagePath,
                    file.name,
                    finalMetadata.width || null,
                    finalMetadata.height || null,
                    optimizedBuffer.length
                ]
            );

        return Response.json({
            ok: true,
            media: {
                id: result.insertId,
                url: publicUrl,
                storage_path: storagePath,
                width: finalMetadata.width || null,
                height: finalMetadata.height || null,
                size: optimizedBuffer.length,
                uploaded_by: "reviewer",
                response_id: response.id
            }
        });

    } catch (err) {

        console.error(
            "CLIENT REVIEWS PUBLIC MEDIA UPLOAD ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error subiendo imagen"
            },
            {
                status: 500
            }
        );
    }
}