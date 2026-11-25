export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import {
  DestinationEditorialError,
  updateDestinationEditorialEntity,
} from "@/app/modules/destination-corridor/server/updateDestinationEditorialEntity";

const SITE_CODE = "ruta100cordoba";

export async function PATCH(request) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ ok: false, error: "El cuerpo JSON no es válido." }, { status: 400 });

  try {
    const entity = await updateDestinationEditorialEntity({
      siteCode: SITE_CODE,
      entityType: body.entityType,
      entityId: body.entityId,
      values: body.values,
      userId: access.session?.id,
    });
    return Response.json({ ok: true, entity });
  } catch (error) {
    if (error instanceof DestinationEditorialError) {
      return Response.json({ ok: false, error: error.message }, { status: error.statusCode });
    }
    console.error("[ruta100/content PATCH]", error);
    return Response.json({ ok: false, error: "No se pudo guardar el contenido territorial." }, { status: 500 });
  }
}
