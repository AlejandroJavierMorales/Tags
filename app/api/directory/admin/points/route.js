import { directoryAdminError, requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { listDirectoryPointAdminData, retireDirectoryPoint, saveDirectoryPoint, saveDirectoryPointType } from "@/app/modules/directory-points/server/directoryPointService";
import { deleteFile } from "@/app/modules/files/lib/deleteFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function responseError(error) {
  console.error("DIRECTORY POINTS ERROR", error);
  const duplicate = error?.code === "ER_DUP_ENTRY";
  return Response.json({ ok: false, error: duplicate ? "Ya existe un tipo con ese código" : error.message || "No se pudo completar la operación" }, { status: error.status || (duplicate ? 409 : 500) });
}

export async function GET(request) {
  const access = await requireDirectoryAdmin();if (!access.ok) return directoryAdminError(access);
  try { return Response.json({ ok: true, ...(await listDirectoryPointAdminData(Number(new URL(request.url).searchParams.get("siteId") || 0))) }); }
  catch (error) { return responseError(error); }
}

async function save(request) {
  const access = await requireDirectoryAdmin();if (!access.ok) return directoryAdminError(access);
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ ok: false, error: "Cuerpo JSON inválido" }, { status: 400 });
  try {
    if (body.entity === "type") return Response.json(await saveDirectoryPointType({ body, access }));
    if (body.entity !== "point") return Response.json({ ok: false, error: "Entidad no válida" }, { status: 400 });
    const result = await saveDirectoryPoint({ body, access });
    if (result.oldPhotoStoragePath && result.oldPhotoStoragePath !== body.primaryPhotoStoragePath) await deleteFile(result.oldPhotoStoragePath);
    return Response.json(result);
  } catch (error) { return responseError(error); }
}

export async function POST(request) { return save(request); }
export async function PATCH(request) { return save(request); }

export async function DELETE(request) {
  const access = await requireDirectoryAdmin();if (!access.ok) return directoryAdminError(access);
  const body = await request.json().catch(() => null);const id = Number(body?.id || 0);
  if (!id) return Response.json({ ok: false, error: "Punto requerido" }, { status: 400 });
  try { return Response.json(await retireDirectoryPoint({ id, access })); }
  catch (error) { return responseError(error); }
}
