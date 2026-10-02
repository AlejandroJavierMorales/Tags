import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { buildProductImportWorkbook, productImportTemplateFilename } from "@/app/modules/product-import/server/productImportWorkbook";
import { resolveProductImportTarget } from "@/app/modules/product-import/server/productImportTargets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const { searchParams } = new URL(request.url);
  const businessId = Number(searchParams.get("businessId") || 0);
  const targetType = String(searchParams.get("targetType") || "");
  if (!businessId || !targetType) return Response.json({ ok: false, error: "Seleccioná un prestador y un aplicativo" }, { status: 400 });
  try {
    const target = await resolveProductImportTarget({ businessId, targetType });
    const workbook = buildProductImportWorkbook({ targetType: target.targetType, categories: target.categories });
    const filename = productImportTemplateFilename(target.targetType, target.business.name);
    return new Response(workbook, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, error: error.message || "No se pudo generar la plantilla" }, { status: 400 });
  }
}

