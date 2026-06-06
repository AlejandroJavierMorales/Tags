// =====================================
// API: /api/qr-page/media/upload
// Nombre: Upload media QR-Page
// Descripción: Sube imágenes/videos a Google Cloud Storage para QR-Page.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { uploadFile } from "@/app/modules/files/lib/uploadFile";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

import sharp from "sharp";

function sanitizeFileName(name = "file") {

    return name
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();
}

function removeExtension(name) {

    return sanitizeFileName(name)
        .replace(/\.[^/.]+$/, "");
}

export async function POST(req) {

    try {

        const formData =
            await req.formData();

        const businessId =
            formData.get("businessId");

        const file =
            formData.get("file");

        const folder =
            formData.get("folder") || "media";

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
                { status: 400 }
            );
        }

        if (!file) {
            return Response.json(
                { error: "Archivo requerido" },
                { status: 400 }
            );
        }

        const access =
            await requireQRPageAccess(
                businessId
            );

        if (!access.ok) {
            return Response.json(
                { error: access.error },
                { status: access.status }
            );
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
            "image/gif",
            "video/mp4",
            "video/webm"
        ];

        if (!allowedTypes.includes(file.type)) {
            return Response.json(
                { error: "Tipo de archivo no permitido" },
                { status: 400 }
            );
        }

        const maxSize =
            file.type.startsWith("video/")
                ? 25 * 1024 * 1024
                : 6 * 1024 * 1024;

        if (file.size > maxSize) {
            return Response.json(
                { error: "Archivo demasiado grande" },
                { status: 400 }
            );
        }

        const bytes =
            await file.arrayBuffer();

        const originalBuffer =
            Buffer.from(bytes);

        const timestamp =
            Date.now();

        const baseName =
            removeExtension(
                file.name
            );

        // =========================
        // VIDEO
        // =========================

        if (file.type.startsWith("video/")) {

            const cleanName =
                sanitizeFileName(
                    file.name
                );

            const storagePath =
                `qr-pages/${businessId}/${folder}/${timestamp}-${cleanName}`;

            const result =
                await uploadFile({
                    buffer:
                        originalBuffer,
                    storagePath,
                    mimeType:
                        file.type
                });

            return Response.json({
                ok: true,
                media: {
                    url:
                        result.url,
                    storagePath:
                        result.storagePath,
                    filename:
                        file.name,
                    mimeType:
                        file.type,
                    size:
                        file.size
                }
            });
        }

        // =========================
        // IMAGE WEBP PRINCIPAL
        // =========================

        const webpBuffer =
            await sharp(originalBuffer)
                .rotate()
                .resize({
                    width:
                        1600,
                    height:
                        1600,
                    fit:
                        "inside",
                    withoutEnlargement:
                        true
                })
                .webp({
                    quality:
                        82
                })
                .toBuffer();

        const webpStoragePath =
            `qr-pages/${businessId}/${folder}/${timestamp}-${baseName}.webp`;

        const webpResult =
            await uploadFile({
                buffer:
                    webpBuffer,
                storagePath:
                    webpStoragePath,
                mimeType:
                    "image/webp"
            });

        // =========================
        // IMAGE JPG OG SOCIAL
        // Solo tiene sentido para SEO / OG.
        // Pero la generamos para todas las imágenes por simplicidad.
        // =========================

        const ogBuffer =
            await sharp(originalBuffer)
                .rotate()
                .resize({
                    width:
                        1200,
                    height:
                        630,
                    fit:
                        "cover",
                    position:
                        "center"
                })
                .jpeg({
                    quality:
                        88,
                    progressive:
                        true
                })
                .toBuffer();

        const ogStoragePath =
            `qr-pages/${businessId}/${folder}/${timestamp}-${baseName}-og.jpg`;

        const ogResult =
            await uploadFile({
                buffer:
                    ogBuffer,
                storagePath:
                    ogStoragePath,
                mimeType:
                    "image/jpeg"
            });

        return Response.json({
            ok: true,
            media: {
                url:
                    webpResult.url,
                og_url:
                    ogResult.url,
                storagePath:
                    webpResult.storagePath,
                ogStoragePath:
                    ogResult.storagePath,
                filename:
                    file.name,
                mimeType:
                    file.type,
                size:
                    file.size
            }
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            { error: err.message },
            { status: 500 }
        );
    }
}