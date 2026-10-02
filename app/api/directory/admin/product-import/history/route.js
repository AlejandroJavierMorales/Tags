import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { listProductImportHistory } from "@/app/modules/product-import/server/productImportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const access = await requireDirectoryAdmin();if (!access.ok) return directoryAdminError(access);
  const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
  try { const imports = await listProductImportHistory({ businessId });return Response.json({ ok: true, imports }); }
  catch (error) { return Response.json({ ok: false, error: error.message || "No se pudo cargar el historial" }, { status: error.status || 500 }); }
}

