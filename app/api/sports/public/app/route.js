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
        `SELECT * FROM tags_sports_apps
         WHERE turnos_id = ? AND business_id = ? AND status = 'active'
         LIMIT 1`,
        [turnosApp.id, turnosApp.business_id]
    );
    const sportsApp = apps[0];
    if (!sportsApp) return jsonResponseError("Tags Deportes no está configurado", 404);

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
        sportsApp: { id: sportsApp.id, name: sportsApp.name, communityEnabled: Number(sportsApp.community_enabled) === 1, publicCommunityEnabled: Number(sportsApp.public_community_enabled) === 1, settings: parseJson(sportsApp.settings_json) },
        disciplines: disciplines.map(item => ({ id: item.id, code: item.code, name: item.name, description: item.description, teamMode: item.team_mode, serviceIds: String(item.service_ids || "").split(",").filter(Boolean).map(Number) }))
    });
}
