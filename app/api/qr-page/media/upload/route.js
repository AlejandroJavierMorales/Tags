// =====================================
// API: /api/qr-page/media/upload
// Upload seguro QR-Page
// Descripción: Sube imágenes/videos a Google Cloud Storage para QR-Page.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import sharp from "sharp";

import { uploadFile }
    from "@/app/modules/files/lib/uploadFile";

import { requireQRPageAccess }
    from "@/app/modules/qr-page/lib/requireQRPageAccess";

function sanitizeFileName(name = "file") {

    return name
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();
}

function removeExtension(name = "file") {

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

        const allowedImageTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif"
        ];

        const allowedVideoTypes = [
            "video/mp4",
            "video/webm"
        ];

        const isImage =
            allowedImageTypes.includes(file.type);

        const isVideo =
            allowedVideoTypes.includes(file.type);

        if (file.type === "image/gif") {

            return Response.json(
                {
                    error:
                        "Los GIF no están permitidos porque afectan negativamente la performance de la QR-Page. Recomendamos usar videos MP4 livianos."
                },
                {
                    status: 400
                }
            );
        }

        if (!isImage && !isVideo) {
            return Response.json(
                {
                    error:
                        "Tipo de archivo no permitido. Usá JPG, PNG, WEBP, AVIF, MP4 o WEBM."
                },
                { status: 400 }
            );
        }

        const maxImageSize =
            6 * 1024 * 1024;

        const maxVideoSize =
            15 * 1024 * 1024;

        if (isImage && file.size > maxImageSize) {
            return Response.json(
                {
                    error:
                        "Imagen demasiado grande. Máximo permitido: 6MB. Si necesitás subir imágenes más grandes, contactanos en info@tags.com.ar."
                },
                { status: 400 }
            );
        }

        if (isVideo && file.size > maxVideoSize) {
            return Response.json(
                {
                    error:
                        "Video demasiado grande. Máximo permitido: 15MB. Si necesitás subir videos más grandes, contactanos en info@tags.com.ar."
                },
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

        if (isVideo) {

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
                    type:
                        "video",
                    url:
                        result.url,
                    storagePath:
                        result.storagePath,
                    filename:
                        file.name,
                    mimeType:
                        file.type,
                    originalSize:
                        file.size,
                    finalSize:
                        originalBuffer.length
                }
            });
        }

        // =========================
        // VALIDAR IMAGEN
        // =========================

        let metadata;

        try {

            metadata =
                await sharp(originalBuffer)
                    .metadata();

        } catch (err) {

            return Response.json(
                {
                    error:
                        "Imagen inválida o corrupta."
                },
                { status: 400 }
            );
        }

        if (!metadata.width || !metadata.height) {
            return Response.json(
                {
                    error:
                        "No se pudieron leer las dimensiones de la imagen."
                },
                { status: 400 }
            );
        }

        if (
            metadata.width > 6000 ||
            metadata.height > 6000
        ) {
            return Response.json(
                {
                    error:
                        "Imagen demasiado grande en dimensiones. Máximo recomendado: 6000px."
                },
                { status: 400 }
            );
        }

        // =========================
        // WEBP PRINCIPAL
        // =========================

        const optimizedFolders = [
            "products",
            "blocks/gallery",
            "blocks/cards",
            "blocks/team",
            "blocks/testimonials"
        ];

        const isCardLikeImage =
            optimizedFolders.includes(folder);

        const maxImageDimension =
            isCardLikeImage ? 900 : 1600;

        let webpBuffer =
            await sharp(originalBuffer)
                .rotate()
                .resize({
                    width:
                        maxImageDimension,
                    height:
                        maxImageDimension,
                    fit:
                        "inside",
                    withoutEnlargement:
                        true
                })
                .webp({
                    quality:
                        isCardLikeImage ? 78 : 82,
                    effort:
                        5
                })
                .toBuffer();

        if (
            isCardLikeImage &&
            webpBuffer.length > 1024 * 1024
        ) {
            webpBuffer =
                await sharp(webpBuffer)
                    .webp({
                        quality:
                            68,
                        effort:
                            6
                    })
                    .toBuffer();
        }

        if (
            isCardLikeImage &&
            webpBuffer.length > 1024 * 1024
        ) {
            return Response.json(
                {
                    error:
                        "La imagen optimizada sigue superando 1MB. Usá una imagen más liviana para mejorar la performance mobile."
                },
                {
                    status: 400
                }
            );
        }

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
        // JPG OG 1200x630
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

        /*         console.log({
                    WEBP_URL:
                        webpResult.url,
        
                    OG_URL:
                        ogResult.url
                });
         */
        return Response.json({
            ok: true,
            media: {
                type:
                    "image",

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
                    "image/webp",

                ogMimeType:
                    "image/jpeg",

                originalMimeType:
                    file.type,

                originalSize:
                    file.size,

                finalSize:
                    webpBuffer.length,

                ogSize:
                    ogBuffer.length,

                originalWidth:
                    metadata.width,

                originalHeight:
                    metadata.height
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