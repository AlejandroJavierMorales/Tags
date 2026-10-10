import { db } from "@/app/lib/tags-db";
import { getPublicLocations, getTurnosBySlug } from "@/app/modules/turnos/lib/getTurnosPublic";

export async function getDirectoryEmbeddedTurnos(businessId) {
  const [rows] = await db.query(`SELECT a.slug FROM tags_turnos_apps a
    WHERE a.business_id=? AND a.status='published'
      AND EXISTS(SELECT 1 FROM tags_business_addons ba WHERE ba.business_id=a.business_id AND ba.addon_code=CASE WHEN a.business_profile_code='sports_club' THEN 'club' ELSE 'turnos' END AND ba.status='active' AND (ba.expires_at IS NULL OR ba.expires_at>=NOW()))
    ORDER BY a.id`, [businessId]);
  const apps = [];
  for (const row of rows) {
    const app = await getTurnosBySlug(row.slug);
    if (!app) continue;
    app.locations = await getPublicLocations(app.id);
    apps.push(app);
  }
  return apps;
}
