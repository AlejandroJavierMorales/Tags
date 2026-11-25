export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { getDestinationCorridorBootstrap } from "@/app/modules/destination-corridor/server/getDestinationCorridorBootstrap";

const SITE_CODE = "ruta100cordoba";

export async function GET() {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);

  try {
    const data = await getDestinationCorridorBootstrap(SITE_CODE);
    if (!data) {
      return Response.json(
        { ok: false, error: "El directorio Ruta 100 Córdoba no está configurado." },
        { status: 404 }
      );
    }
    return Response.json({ ok: true, ...data });
  } catch (error) {
    console.error("[ruta100/bootstrap]", error);
    return Response.json(
      { ok: false, error: "No se pudo cargar la configuración territorial de Ruta 100." },
      { status: 500 }
    );
  }
}

