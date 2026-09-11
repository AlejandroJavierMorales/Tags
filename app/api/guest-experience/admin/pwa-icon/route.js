export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import sharp from "sharp";
import { db } from "@/app/lib/tags-db";
import { uploadFile } from "@/app/modules/files/lib/uploadFile";
import { deleteFile } from "@/app/modules/files/lib/deleteFile";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);

async function pngIcon(source, size) {
  return sharp(source)
    .rotate()
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export async function POST(request) {
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  const businessId = Number(form.get("businessId") || 0);
  const guestAppId = Number(form.get("guestAppId") || form.get("entityId") || 0);
  const file = form.get("file");
  const access = await getGuestAdminAccess({ businessId, guestAppId });
  if (!access.allowed) return guestAdminAccessResponse(access);
  if (!file || !ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: "Usá una imagen PNG, JPG, WEBP o AVIF." }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return Response.json({ error: "El icono no puede superar los 2 MB." }, { status: 400 });
  }

  const [apps] = await db.query(
    "SELECT settings_json FROM tags_guest_apps WHERE id=? AND business_id=? LIMIT 1",
    [guestAppId, businessId]
  );
  if (!apps[0]) return Response.json({ error: "Mi Estadía no encontrada" }, { status: 404 });
  const previous = parseGuestJson(apps[0].settings_json);
  const source = Buffer.from(await file.arrayBuffer());

  try {
    await sharp(source).metadata();
    const stamp = Date.now();
    const basePath = `guest-experience/${businessId}/pwa-icon/${guestAppId}`;
    const [icon192, icon512] = await Promise.all([pngIcon(source, 192), pngIcon(source, 512)]);
    const [uploaded192, uploaded512] = await Promise.all([
      uploadFile({ buffer: icon192, storagePath: `${basePath}/icon-192-${stamp}.png`, mimeType: "image/png" }),
      uploadFile({ buffer: icon512, storagePath: `${basePath}/icon-512-${stamp}.png`, mimeType: "image/png" })
    ]);
    const settings = {
      ...previous,
      pwaIcon192Url: uploaded192.url,
      pwaIcon512Url: uploaded512.url,
      pwaIcon192StoragePath: uploaded192.storagePath,
      pwaIcon512StoragePath: uploaded512.storagePath
    };
    await db.query(
      "UPDATE tags_guest_apps SET settings_json=?,updated_at=NOW() WHERE id=? AND business_id=?",
      [JSON.stringify(settings), guestAppId, businessId]
    );
    await Promise.all([
      previous.pwaIcon192StoragePath && previous.pwaIcon192StoragePath !== uploaded192.storagePath
        ? deleteFile(previous.pwaIcon192StoragePath).catch(() => {}) : null,
      previous.pwaIcon512StoragePath && previous.pwaIcon512StoragePath !== uploaded512.storagePath
        ? deleteFile(previous.pwaIcon512StoragePath).catch(() => {}) : null
    ]);
    return Response.json({
      ok: true,
      media: { url: uploaded512.url, icon192Url: uploaded192.url, icon512Url: uploaded512.url }
    });
  } catch (error) {
    console.error("GUEST PWA ICON UPLOAD ERROR", error);
    return Response.json({ error: "No se pudo procesar el icono." }, { status: 400 });
  }
}
