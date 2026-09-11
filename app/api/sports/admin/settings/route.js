export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSportsAccess } from "@/app/modules/sports/lib/getSportsAccess";
import { turnosAccessResponse } from "@/app/modules/turnos/lib/access/getTurnosAccess";
import { jsonResponseError, parseJson } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const params = new URL(req.url).searchParams;
    const businessId = Number(params.get("businessId") || 0);
    const turnosId = Number(params.get("turnosId") || 0);
    if (!businessId || !turnosId) return jsonResponseError("businessId y turnosId son requeridos");

    const access = await getSportsAccess({ businessId, turnosId, permission: "sports.dashboard.view" });
    if (!access.allowed) return turnosAccessResponse(access);

    const [disciplines, resources, services, rates] = await Promise.all([
        db.query(`SELECT * FROM tags_sports_disciplines WHERE sports_app_id = ? ORDER BY sort_order ASC, name ASC`, [access.sportsApp.id]),
        db.query(
            `SELECT r.id, r.name, r.resource_type_id, r.is_active, rt.name AS resource_type_name,
                    GROUP_CONCAT(DISTINCT rd.discipline_id ORDER BY rd.discipline_id) AS discipline_ids
                    ,GROUP_CONCAT(DISTINCT CASE WHEN sr.is_active = 1 THEN sr.service_id END ORDER BY sr.service_id) AS service_ids
             FROM tags_turnos_resources r
             INNER JOIN tags_turnos_resource_types rt ON rt.id = r.resource_type_id
             LEFT JOIN tags_sports_resource_disciplines rd
               ON rd.resource_id = r.id AND rd.sports_app_id = ?
             LEFT JOIN tags_turnos_service_resources sr ON sr.resource_id = r.id
             WHERE r.turnos_id = ?
             GROUP BY r.id, r.name, r.resource_type_id, r.is_active, rt.name
             ORDER BY r.sort_order ASC, r.name ASC`,
            [access.sportsApp.id, turnosId]
        ),
        db.query(`SELECT s.*,
                    (SELECT rr.resource_type_id FROM tags_turnos_service_resource_requirements rr WHERE rr.service_id=s.id ORDER BY rr.id LIMIT 1) AS required_resource_type_id
                  FROM tags_turnos_services s WHERE s.turnos_id = ? AND s.is_active=1 ORDER BY s.sort_order ASC, s.name ASC`, [turnosId]),
        db.query(`SELECT * FROM tags_sports_service_rates WHERE sports_app_id = ? AND is_active = 1 ORDER BY service_id ASC, audience_type ASC`, [access.sportsApp.id])
    ]);

    return Response.json({
        ok: true,
        sportsApp: { ...access.sportsApp, settings: parseJson(access.sportsApp.settings_json) },
        disciplines: disciplines[0],
        resources: resources[0].map(item => ({
            ...item,
            disciplineIds: String(item.discipline_ids || "").split(",").filter(Boolean).map(Number),
            serviceIds: String(item.service_ids || "").split(",").filter(Boolean).map(Number)
        })),
        services: services[0].map(item => ({ ...item, settings: parseJson(item.settings_json) })),
        rates: rates[0]
    });
}

export async function POST(req) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonResponseError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0);
    const turnosId = Number(body.turnosId || 0);
    const access = await getSportsAccess({ businessId, turnosId, permission: "settings.manage" });
    if (!access.allowed) return turnosAccessResponse(access);

    const settings = body.settings && typeof body.settings === "object" ? body.settings : {};
    await db.query(
        `UPDATE tags_sports_apps
         SET community_enabled = ?, public_community_enabled = ?, settings_json = ?, updated_at = NOW()
         WHERE id = ?`,
        [body.communityEnabled === true ? 1 : 0, body.publicCommunityEnabled === true ? 1 : 0, JSON.stringify(settings), access.sportsApp.id]
    );
    return Response.json({ ok: true });
}
