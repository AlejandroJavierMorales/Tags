// =====================================
// API: /api/qr-page/media/upload
//
// Descripción:
// Upload seguro y retrocompatible.
// Mantiene formato legacy y soporta
// nuevo sistema module / variant / entityId.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import sharp from "sharp";

import { uploadFile }
    from "@/app/modules/files/lib/uploadFile";

import { deleteFile }
    from "@/app/modules/files/lib/deleteFile";

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

const IMAGE_PRESETS = {
    hero: {
        maxDimension: 1600,
        quality: 78,
        maxFinalSize: 2 * 900 * 1024,
        generateOG: true,
        defaultFileName: "hero"
    },
    banner: {
        maxDimension: 1600,
        quality: 78,
        maxFinalSize: 2 * 900 * 1024,
        generateOG: true,
        defaultFileName: "banner"
    },
    product: {
        maxDimension: 1200,
        quality: 80,
        maxFinalSize: 1200 * 1024,
        generateOG: false,
        defaultFileName: "product"
    },
    gallery: {
        maxDimension: 1200,
        quality: 80,
        maxFinalSize: 2 * 1024 * 1024,
        generateOG: false,
        defaultFileName: "image"
    },
    logo: {
        maxDimension: 500,
        quality: 85,
        maxFinalSize: 500 * 900,
        generateOG: false,
        defaultFileName: "logo"
    },
    avatar: {
        maxDimension: 600,
        quality: 85,
        maxFinalSize: 600 * 900,
        generateOG: false,
        defaultFileName: "avatar"
    },
    default: {
        maxDimension: 1200,
        quality: 80,
        maxFinalSize: 2 * 1024 * 1024,
        generateOG: true,
        defaultFileName: "image"
    }
};

function getPreset(variant) {
    return IMAGE_PRESETS[variant] || IMAGE_PRESETS.default;
}

function buildStorageBasePath({
    module,
    businessId,
    variant,
    entityId
}) {
    if (module === "store") {
        if (entityId) {
            return `store/${businessId}/blocks/${entityId}`;
        }

        return `store/${businessId}/${variant}`;
    }

    if (module === "qr-page") {
        if (entityId) {
            return `qr-pages/${businessId}/blocks/${entityId}`;
        }

        return `qr-pages/${businessId}/${variant}`;
    }

    if (module === "tags-id") {
        return `tags-id/${businessId}/${variant}`;
    }

    return `${module}/${businessId}/${variant}`;
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

        const module =
            formData.get("module");

        const variant =
            formData.get("variant");

        const entityId =
            formData.get("entityId");

        const fileName =
            formData.get("fileName");

        const replace =
            String(formData.get("replace") || "0") === "1";

        const previousStoragePath =
            formData.get("previousStoragePath");

        const previousOgStoragePath =
            formData.get("previousOgStoragePath");

        const hasNewFormat =
            module && variant;

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
                        "Los GIF no están permitidos. Recomendamos usar videos MP4 livianos."
                },
                { status: 400 }
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
            12 * 1024 * 1024;

        const maxVideoSize =
            15 * 1024 * 1024;

        if (isImage && file.size > maxImageSize) {
            return Response.json(
                { error: "Imagen demasiado grande. Máximo permitido: 12MB." },
                { status: 400 }
            );
        }

        if (isVideo && file.size > maxVideoSize) {
            return Response.json(
                { error: "Video demasiado grande. Máximo permitido: 15MB." },
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
            removeExtension(file.name);

        const storageBasePath =
            hasNewFormat
                ? buildStorageBasePath({
                    module,
                    businessId,
                    variant,
                    entityId
                })
                : null;

        // -----------------------------
        // VIDEO
        // -----------------------------

        if (isVideo) {
            const cleanName =
                sanitizeFileName(file.name);

            const extension =
                cleanName.split(".").pop();

            const videoFileName =
                hasNewFormat
                    ? `${sanitizeFileName(fileName || variant)}-${timestamp}.${extension}`
                    : `${timestamp}-${cleanName}`;

            const storagePath =
                hasNewFormat
                    ? `${storageBasePath}/${videoFileName}`
                    : `qr-pages/${businessId}/${folder}/${videoFileName}`;

            const result =
                await uploadFile({
                    buffer: originalBuffer,
                    storagePath,
                    mimeType: file.type
                });

            if (
                hasNewFormat &&
                replace &&
                previousStoragePath &&
                previousStoragePath !== result.storagePath
            ) {

                await deleteFile(previousStoragePath);
            }

            return Response.json({
                ok: true,
                media: {
                    type: "video",
                    url: result.url,
                    storagePath: result.storagePath,
                    filename: file.name,
                    mimeType: file.type,
                    originalSize: file.size,
                    finalSize: originalBuffer.length
                }
            });
        }

        // -----------------------------
        // VALIDAR IMAGEN
        // -----------------------------

        let metadata;

        try {
            metadata =
                await sharp(originalBuffer)
                    .metadata();

        } catch {
            return Response.json(
                { error: "Imagen inválida o corrupta." },
                { status: 400 }
            );
        }

        if (!metadata.width || !metadata.height) {
            return Response.json(
                { error: "No se pudieron leer las dimensiones de la imagen." },
                { status: 400 }
            );
        }

        if (
            metadata.width > 8000 ||
            metadata.height > 8000
        ) {
            return Response.json(
                {
                    error:
                        "Imagen demasiado grande en dimensiones. Máximo permitido: 8000px."
                },
                { status: 400 }
            );
        }

        // -----------------------------
        // PRESET
        // -----------------------------

        const preset =
            hasNewFormat
                ? getPreset(variant)
                : null;

        const legacyOptimizedFolders = [
            "products",
            "blocks/gallery",
            "blocks/cards",
            "blocks/team",
            "blocks/testimonials"
        ];

        const legacyIsCardLikeImage =
            legacyOptimizedFolders.includes(folder);

        const maxImageDimension =
            hasNewFormat
                ? preset.maxDimension
                : legacyIsCardLikeImage
                    ? 900
                    : 1600;

        const quality =
            hasNewFormat
                ? preset.quality
                : legacyIsCardLikeImage
                    ? 78
                    : 82;

        let webpBuffer =
            await sharp(originalBuffer)
                .rotate()
                .resize({
                    width: maxImageDimension,
                    height: maxImageDimension,
                    fit: "inside",
                    withoutEnlargement: true
                })
                .webp({
                    quality,
                    effort: 5
                })
                .toBuffer();

        const maxFinalSize =
            hasNewFormat
                ? preset.maxFinalSize
                : legacyIsCardLikeImage
                    ? 1024 * 1024
                    : 2 * 1024 * 1024;

        if (webpBuffer.length > maxFinalSize) {
            webpBuffer =
                await sharp(webpBuffer)
                    .webp({
                        quality: Math.max(60, quality - 12),
                        effort: 6
                    })
                    .toBuffer();
        }

        if (webpBuffer.length > maxFinalSize) {
            return Response.json(
                {
                    error:
                        "La imagen optimizada sigue siendo demasiado pesada. Probá con otra imagen."
                },
                { status: 400 }
            );
        }

        const finalFileName =
            hasNewFormat
                ? sanitizeFileName(
                    fileName ||
                    preset.defaultFileName ||
                    "image"
                )
                : `${timestamp}-${baseName}`;

        const webpStoragePath =
            hasNewFormat
                ? `${storageBasePath}/${finalFileName}-${timestamp}.webp`
                : `qr-pages/${businessId}/${folder}/${timestamp}-${baseName}.webp`;

        const webpResult =
            await uploadFile({
                buffer: webpBuffer,
                storagePath: webpStoragePath,
                mimeType: "image/webp"
            });

        // -----------------------------
        // OG OPCIONAL
        // -----------------------------

        let ogResult = null;
        let ogBuffer = null;

        const shouldGenerateOG =
            hasNewFormat
                ? preset.generateOG
                : true;

        if (shouldGenerateOG) {
            ogBuffer =
                await sharp(originalBuffer)
                    .rotate()
                    .resize({
                        width: 1200,
                        height: 630,
                        fit: "cover",
                        position: "center"
                    })
                    .jpeg({
                        quality: 88,
                        progressive: true
                    })
                    .toBuffer();

            const ogStoragePath =
                hasNewFormat
                    ? `${storageBasePath}/${finalFileName}-${timestamp}-og.jpg`
                    : `qr-pages/${businessId}/${folder}/${timestamp}-${baseName}-og.jpg`;

            ogResult =
                await uploadFile({
                    buffer: ogBuffer,
                    storagePath: ogStoragePath,
                    mimeType: "image/jpeg"
                });
        }

        // -----------------------------
        // LIMPIEZA DE REEMPLAZO
        // -----------------------------
        console.log("DELETE CHECK:", {
            hasNewFormat,
            replace,
            previousStoragePath,
            previousOgStoragePath,
            newStoragePath: webpResult.storagePath,
            newOgStoragePath: ogResult?.storagePath
        });
        if (
            hasNewFormat &&
            replace &&
            previousStoragePath &&
            previousStoragePath !== webpResult.storagePath
        ) {
            await deleteFile(previousStoragePath);
        }

        if (
            hasNewFormat &&
            replace &&
            previousOgStoragePath &&
            previousOgStoragePath !== ogResult?.storagePath
        ) {
            await deleteFile(previousOgStoragePath);
        }

        return Response.json({
            ok: true,
            media: {
                type: "image",
                url: webpResult.url,
                og_url: ogResult?.url || null,
                storagePath: webpResult.storagePath,
                ogStoragePath: ogResult?.storagePath || null,
                filename: file.name,
                mimeType: "image/webp",
                ogMimeType: ogResult ? "image/jpeg" : null,
                originalMimeType: file.type,
                originalSize: file.size,
                finalSize: webpBuffer.length,
                ogSize: ogBuffer?.length || null,
                originalWidth: metadata.width,
                originalHeight: metadata.height
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