// =====================================
// API: /api/users/profile-image
// Descripcion: Imagen personal cuadrada de 750x750 y maximo 2 MB.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import sharp from "sharp";
import { db } from "@/app/lib/tags-db";
import { deleteFile } from "@/app/modules/files/lib/deleteFile";
import { uploadFile } from "@/app/modules/files/lib/uploadFile";
import { getSessionUser } from "@/app/modules/users/lib/userSession";

const MAX_INPUT_SIZE = 2 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 2 * 1024 * 1024;

export async function POST(request) {
    const session = await getSessionUser();
    if (!session) return Response.json({ success: false, error: "No autenticado" }, { status: 401 });

    try {
        const form = await request.formData();
        const file = form.get("file");
        if (!file || typeof file.arrayBuffer !== "function") {
            return Response.json({ success: false, error: "Imagen requerida" }, { status: 400 });
        }
        if (!String(file.type || "").startsWith("image/")) {
            return Response.json({ success: false, error: "Solo se permiten imágenes" }, { status: 400 });
        }
        if (Number(file.size || 0) > MAX_INPUT_SIZE) {
            return Response.json({ success: false, error: "La imagen no puede superar los 2 MB" }, { status: 400 });
        }

        const sourceBuffer = Buffer.from(await file.arrayBuffer());
        let outputBuffer = await sharp(sourceBuffer)
            .rotate()
            .resize({ width: 750, height: 750, fit: "cover", position: "centre" })
            .webp({ quality: 86, effort: 5 })
            .toBuffer();

        if (outputBuffer.length > MAX_OUTPUT_SIZE) {
            outputBuffer = await sharp(sourceBuffer)
                .rotate()
                .resize({ width: 750, height: 750, fit: "cover", position: "centre" })
                .webp({ quality: 70, effort: 6 })
                .toBuffer();
        }
        if (outputBuffer.length > MAX_OUTPUT_SIZE) {
            return Response.json({ success: false, error: "La imagen optimizada supera los 2 MB" }, { status: 400 });
        }

        const storagePath = `users/${session.userId}/profile/avatar.webp`;
        const [oldRows] = await db.query(`SELECT profile_image_storage_path FROM tags_users WHERE id=? LIMIT 1`, [session.userId]);
        const result = await uploadFile({ buffer: outputBuffer, storagePath, mimeType: "image/webp" });
        await db.query(
            `UPDATE tags_users
                SET profile_image_url=?,profile_image_storage_path=?,profile_image_width=750,profile_image_height=750,updated_at=NOW()
              WHERE id=?`,
            [result.url, result.storagePath, session.userId]
        );
        if (oldRows[0]?.profile_image_storage_path && oldRows[0].profile_image_storage_path !== storagePath) {
            await deleteFile(oldRows[0].profile_image_storage_path);
        }

        return Response.json({
            success: true,
            media: { url: result.url, storagePath: result.storagePath, width: 750, height: 750, mimeType: "image/webp", finalSize: outputBuffer.length }
        });
    } catch (error) {
        console.error("USER PROFILE IMAGE ERROR", error);
        return Response.json({ success: false, error: "No se pudo procesar la imagen" }, { status: 400 });
    }
}
