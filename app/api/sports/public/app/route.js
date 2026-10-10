export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosBySlug } from "@/app/modules/turnos/lib/getTurnosPublic";
import { jsonResponseError, parseJson } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const slug = new URL(req.url).searchParams.get("slug");
    const turnosApp = await getTurnosBySlug(slug);
    if (!turnosApp || turnosApp.business_profile_code !== "sports_club") return jsonResponseError("Página deportiva no encontrada", 404);

    const [apps] = await db.query(
        `SELECT sa.*,
                COALESCE(NULLIF(b.display_name,''),b.name) business_name,
                b.description business_description,b.logo_url business_logo_url,b.cover_url business_cover_url
         FROM tags_sports_apps sa
         INNER JOIN tags_businesses b ON b.id=sa.business_id
         WHERE sa.turnos_id = ? AND sa.business_id = ? AND sa.status = 'active'
         LIMIT 1`,
        [turnosApp.id, turnosApp.business_id]
    );
    const sportsApp = apps[0];
    if (!sportsApp) return jsonResponseError("Tags Club no está configurado", 404);
    if (sportsApp.public_visibility === "hidden") return jsonResponseError("Tags Club no está publicado", 404);

    const [disciplines] = await db.query(
        `SELECT d.*,
                (SELECT GROUP_CONCAT(DISTINCT sr.service_id ORDER BY sr.service_id)
                 FROM tags_sports_resource_disciplines rd
                 INNER JOIN tags_turnos_service_resources sr ON sr.resource_id = rd.resource_id AND sr.is_active = 1
                 WHERE rd.discipline_id = d.id AND rd.sports_app_id = d.sports_app_id) AS service_ids
         FROM tags_sports_disciplines d
         WHERE d.sports_app_id = ? AND d.is_active = 1
         ORDER BY d.sort_order ASC, d.name ASC`,
        [sportsApp.id]
    );

    return Response.json({
        ok: true,
        sportsApp: { id: sportsApp.id, name: sportsApp.business_name || sportsApp.name, description: sportsApp.business_description || "", logoUrl: sportsApp.business_logo_url || "", coverUrl: sportsApp.business_cover_url || "", publicVisibility: sportsApp.public_visibility, defaultDisciplineId: sportsApp.default_discipline_id, communityEnabled: Number(sportsApp.community_enabled) === 1, publicCommunityEnabled: Number(sportsApp.public_community_enabled) === 1, settings: parseJson(sportsApp.settings_json) },
        disciplines: disciplines.map(item => ({ id: item.id, code: item.code, name: item.name, description: item.description, teamMode: item.team_mode, serviceIds: String(item.service_ids || "").split(",").filter(Boolean).map(Number) }))
    });
}
