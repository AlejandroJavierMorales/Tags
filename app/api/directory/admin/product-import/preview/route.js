import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { cleanImportValue, PRODUCT_IMPORT_MODES, validateProductImport } from "@/app/modules/product-import/server/productImportValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const access = await requireDirectoryAdmin();if (!access.ok) return directoryAdminError(access);
  const form = await request.formData().catch(() => null);const file = form?.get("file");const businessId = Number(form?.get("businessId") || 0);const targetType = cleanImportValue(form?.get("targetType"));const requestedMode = cleanImportValue(form?.get("overwriteMode"));const overwriteMode = PRODUCT_IMPORT_MODES.has(requestedMode) ? requestedMode : "create_only";const imageFiles = (form?.getAll("images") || []).filter(item => typeof item?.name === "string" && item.name);
  if (!file || typeof file.arrayBuffer !== "function" || !businessId || !targetType) return Response.json({ ok: false, error: "Prestador, aplicativo y archivo Excel son obligatorios" }, { status: 400 });
  if (!String(file.name || "").toLowerCase().endsWith(".xlsx")) return Response.json({ ok: false, error: "Seleccioná una plantilla XLSX" }, { status: 400 });
  if (Number(file.size || 0) > 8 * 1024 * 1024) return Response.json({ ok: false, error: "El Excel supera el máximo de 8 MB" }, { status: 413 });
  if (imageFiles.length > 150) return Response.json({ ok: false, error: "Seleccioná como máximo 150 imágenes por importación" }, { status: 400 });
  try { const validation = await validateProductImport({ buffer: Buffer.from(await file.arrayBuffer()), businessId, targetType, overwriteMode, imageFiles });return Response.json({ ok: validation.valid, mode: "preview", report: validation.report }); }
  catch (error) { console.error("PRODUCT IMPORT PREVIEW ERROR", error);return Response.json({ ok: false, error: error.message || "No se pudo revisar la planilla" }, { status: 400 }); }
}

