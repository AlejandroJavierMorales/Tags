import sharp from "sharp";
import { uploadFile } from "@/app/modules/files/lib/uploadFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return Response.json({ error: "Logo requerido" }, { status: 400 });
    if (!ALLOWED.has(file.type)) return Response.json({ error: "El logo debe estar en JPG, PNG, WebP o AVIF" }, { status: 400 });
    if (Number(file.size || 0) > 5 * 1024 * 1024) return Response.json({ error: "El logo no puede superar 5 MB" }, { status: 400 });
    const buffer = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 700, height: 700, fit: "inside", withoutEnlargement: true }).webp({ quality: 86, effort: 5 }).toBuffer();
    const result = await uploadFile({ buffer, storagePath: `directory/public-signups/logo-${Date.now()}.webp`, mimeType: "image/webp" });
    return Response.json({ ok: true, media: { type: "image", url: result.url, storagePath: result.storagePath, mimeType: "image/webp" } });
  } catch (error) {
    console.error("PUBLIC DIRECTORY LOGO ERROR", error);
    return Response.json({ error: "No se pudo cargar el logo" }, { status: 500 });
  }
}
