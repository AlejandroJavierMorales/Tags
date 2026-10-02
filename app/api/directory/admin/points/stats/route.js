import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { getDirectoryPointStats } from "@/app/modules/directory-points/server/directoryPointScanService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const search = new URL(request.url).searchParams;
  try {
    const stats = await getDirectoryPointStats({
      siteId: search.get("siteId"),
      from: search.get("from"),
      to: search.get("to"),
      typeId: search.get("typeId"),
      pointId: search.get("pointId"),
      hostBusinessId: search.get("hostBusinessId"),
      attribution: search.get("attribution"),
    });
    return Response.json({ ok:true,...stats });
  } catch (error) {
    console.error("DIRECTORY POINT STATS ERROR",error);
    return Response.json({ ok:false,error:error.message || "No se pudieron cargar las estadísticas" },{ status:error.status || 500 });
  }
}
