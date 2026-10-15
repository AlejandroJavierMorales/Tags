import { db } from "@/app/lib/tags-db";
import { requireDirectoryAdmin, directoryAdminError } from "@/app/modules/directory/lib/requireDirectoryAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const text = (value, max) => String(value || "").trim().slice(0, max);
const code = value => text(value, 80).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "general";
const missingTables = error => ["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code);

export async function GET() {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  try {
    const [sites, groups, videos] = await Promise.all([
      db.query("SELECT id,name,code FROM tags_directory_sites WHERE is_active=1 ORDER BY name"),
      db.query("SELECT * FROM tags_directory_tutorial_groups ORDER BY site_id,sort_order,name"),
      db.query("SELECT * FROM tags_directory_tutorials ORDER BY group_id,sort_order,title")
    ]);
    return Response.json({ ok: true, sites: sites[0], groups: groups[0], videos: videos[0] });
  } catch (error) {
    if (missingTables(error)) return Response.json({ error: "Falta ejecutar la migración de Tutoriales" }, { status: 409 });
    throw error;
  }
}

export async function POST(request) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const body = await request.json().catch(() => null);
  try {
    if (body?.entity === "group") {
      const id = Number(body.id || 0), siteId = Number(body.siteId || 0), name = text(body.name, 140);
      if (!siteId || !name) return Response.json({ error: "Directorio y nombre son obligatorios" }, { status: 400 });
      if (id) await db.query("UPDATE tags_directory_tutorial_groups SET site_id=?,product_code=?,name=?,description=?,sort_order=?,is_active=?,updated_at=NOW() WHERE id=?", [siteId, code(body.productCode || name), name, text(body.description, 4000) || null, Number(body.sortOrder || 0), body.isActive === false ? 0 : 1, id]);
      else await db.query("INSERT INTO tags_directory_tutorial_groups (site_id,product_code,name,description,sort_order,is_active) VALUES (?,?,?,?,?,?)", [siteId, code(body.productCode || name), name, text(body.description, 4000) || null, Number(body.sortOrder || 0), body.isActive === false ? 0 : 1]);
      return Response.json({ ok: true });
    }
    if (body?.entity === "video") {
      const id = Number(body.id || 0), groupId = Number(body.groupId || 0), title = text(body.title, 180), videoUrl = text(body.videoUrl, 4000);
      if (!groupId || !title || !videoUrl) return Response.json({ error: "Grupo, título y video son obligatorios" }, { status: 400 });
      const [[group]] = await db.query("SELECT id FROM tags_directory_tutorial_groups WHERE id=? LIMIT 1", [groupId]);
      if (!group) return Response.json({ error: "Grupo no encontrado" }, { status: 404 });
      const values = [groupId, title, text(body.description, 8000) || null, videoUrl, text(body.videoStoragePath, 500) || null, Number(body.sortOrder || 0), body.status === "published" ? "published" : "draft", body.isActive === false ? 0 : 1];
      if (id) await db.query("UPDATE tags_directory_tutorials SET group_id=?,title=?,description=?,video_url=?,video_storage_path=?,sort_order=?,status=?,is_active=?,updated_at=NOW() WHERE id=?", [...values, id]);
      else await db.query("INSERT INTO tags_directory_tutorials (group_id,title,description,video_url,video_storage_path,sort_order,status,is_active) VALUES (?,?,?,?,?,?,?,?)", values);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Entidad inválida" }, { status: 400 });
  } catch (error) {
    if (missingTables(error)) return Response.json({ error: "Falta ejecutar la migración de Tutoriales" }, { status: 409 });
    console.error("DIRECTORY TUTORIAL SAVE ERROR", error);
    return Response.json({ error: "No se pudo guardar" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);
  const body = await request.json().catch(() => null);
  const id = Number(body?.id || 0);
  if (!id) return Response.json({ error: "Registro inválido" }, { status: 400 });
  if (body.entity === "video") await db.query("DELETE FROM tags_directory_tutorials WHERE id=?", [id]);
  else if (body.entity === "group") {
    const [[usage]] = await db.query("SELECT COUNT(*) total FROM tags_directory_tutorials WHERE group_id=?", [id]);
    if (Number(usage.total) > 0) return Response.json({ error: "Mové o eliminá sus videos antes de eliminar el grupo" }, { status: 409 });
    await db.query("DELETE FROM tags_directory_tutorial_groups WHERE id=?", [id]);
  } else return Response.json({ error: "Entidad inválida" }, { status: 400 });
  return Response.json({ ok: true });
}
