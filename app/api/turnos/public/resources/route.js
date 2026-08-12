export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getTurnosBySlug } from "@/app/modules/turnos/lib/getTurnosPublic";
import { jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const query = new URL(req.url).searchParams;
    const app = await getTurnosBySlug(query.get("slug"));
    const serviceId = Number(query.get("serviceId") || 0);
    if (!app) return jsonResponseError("Página no encontrada", 404);
    const [resources] = await db.query(
        `SELECT r.id,r.name,r.capacity,rt.name resource_type_name,
                COALESCE(JSON_EXTRACT(r.public_metadata_json,'$.allowConsecutiveBookings'),FALSE) allow_consecutive_bookings,
                COALESCE(JSON_EXTRACT(r.public_metadata_json,'$.maxConsecutiveSlots'),1) max_consecutive_slots
         FROM tags_turnos_resources r
         INNER JOIN tags_turnos_service_resources sr ON sr.resource_id=r.id AND sr.service_id=? AND sr.is_active=1
         INNER JOIN tags_turnos_resource_types rt ON rt.id=r.resource_type_id
         WHERE r.turnos_id=? AND r.is_active=1
         ORDER BY r.sort_order,r.name`,
        [serviceId, app.id]
    );
    return Response.json({ ok: true, resources });
}
