export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { bucket } from "@/app/modules/files/lib/googleStorage";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";

function publicUrl(storagePath) {
  const encodedPath = String(storagePath || "").split("/").map(encodeURIComponent).join("/");
  return `https://storage.googleapis.com/${process.env.GOOGLE_STORAGE_BUCKET}/${encodedPath}`;
}

export async function GET(request) {
  const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
  if (!businessId) return Response.json({ error: "businessId requerido" }, { status: 400 });

  const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

  try {
    const prefix = `directory/${businessId}/catalog/`;
    const [files] = await bucket.getFiles({ prefix, autoPaginate: true, maxResults: 500 });
    const media = files
      .filter(file => /\.(webp|jpe?g|png|avif)$/i.test(file.name) && !/-og\.jpg$/i.test(file.name))
      .sort((a, b) => String(b.name).localeCompare(String(a.name)))
      .map(file => ({ url: publicUrl(file.name), storagePath: file.name, alt: "" }));
    return Response.json({ ok: true, media });
  } catch (error) {
    console.error("CATALOG MEDIA LIBRARY ERROR", error);
    return Response.json({ error: "No se pudieron consultar las imágenes cargadas" }, { status: 500 });
  }
}
