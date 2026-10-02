import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { listProductImportTargets } from "@/app/modules/product-import/server/productImportTargets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  try {
    const businesses = await listProductImportTargets();
    return Response.json({ ok: true, businesses });
  } catch (error) {
    console.error("PRODUCT IMPORT OPTIONS ERROR", error);
    return Response.json({ ok: false, error: "No se pudieron cargar los prestadores y aplicativos" }, { status: 500 });
  }
}

