export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireDirectoryAdmin, directoryAdminError } from "@/app/modules/directory/lib/requireDirectoryAdmin";

export async function GET() {
  const access = await requireDirectoryAdmin();
  if (!access.ok) return directoryAdminError(access);

  const [rows] = await db.query(
    `SELECT id,parent_id,place_type,name,slug,country_code
     FROM tags_geo_places
     WHERE is_active=1
     ORDER BY name`
  );

  return Response.json({ ok: true, places: rows });
}
