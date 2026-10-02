import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { commitProductImport } from "@/app/modules/product-import/server/productImportService";
import { cleanImportValue, PRODUCT_IMPORT_MODES } from "@/app/modules/product-import/server/productImportValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const access = await requireDirectoryAdmin();if (!access.ok) return directoryAdminError(access);
  const form = await request.formData().catch(() => null);const file = form?.get("file");const businessId = Number(form?.get("businessId") || 0);const targetType = cleanImportValue(form?.get("targetType"));const overwriteMode = cleanImportValue(form?.get("overwriteMode"));const imageFiles = (form?.getAll("images") || []).filter(item => typeof item?.name === "string" && item.name);
  if (!file || typeof file.arrayBuffer !== "function" || !businessId || !targetType || !PRODUCT_IMPORT_MODES.has(overwriteMode)) return Response.json({ ok: false, error: "Prestador, aplicativo, modo y archivo Excel son obligatorios" }, { status: 400 });
  if (!String(file.name || "").toLowerCase().endsWith(".xlsx")) return Response.json({ ok: false, error: "Seleccioná una plantilla XLSX" }, { status: 400 });
  if (Number(file.size || 0) > 8 * 1024 * 1024 || imageFiles.length > 150) return Response.json({ ok: false, error: "El archivo o la cantidad de imágenes supera el límite permitido" }, { status: 413 });
  try { const result = await commitProductImport({ buffer: Buffer.from(await file.arrayBuffer()), filename: file.name, businessId, targetType, overwriteMode, imageFiles, actorId: Number(access.session?.id || 0) || null });return Response.json(result); }
  catch (error) { console.error("PRODUCT IMPORT COMMIT ERROR", error);return Response.json({ ok: false, error: error.message || "No se pudo importar", report: error.report || null }, { status: error.status || 500 }); }
}

