export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTurnosBySlug, getPublicServices } from "@/app/modules/turnos/lib/getTurnosPublic";
import { jsonResponseError } from "@/app/modules/turnos/lib/turnosService";
import { db } from "@/app/lib/tags-db";
import { getSportsBookingPolicy } from "@/app/modules/sports/lib/getSportsBookingPolicy";

export async function GET(req) {
    const slug = new URL(req.url).searchParams.get("slug");
    const app = await getTurnosBySlug(slug);
    if (!app) return jsonResponseError("Página de Turnos no encontrada", 404, "TURNOS_NOT_FOUND");
    const services = await getPublicServices(app.id);
    if (app.business_profile_code !== "sports_club") return Response.json({ ok: true, services });
    const visible = [];
    for (const service of services) {
        const policy = await getSportsBookingPolicy(db, app, service);
        if (["admin_only", "members_only"].includes(policy?.audienceMode)) continue;
        visible.push({
            ...service,
            price: policy?.guestPrice ?? service.price,
            currency: policy?.currency || service.currency,
            sports_audience_mode: policy?.audienceMode || "members_and_guests",
            sports_duration_policy: policy ? {
                minimumMinutes: policy.minimumMinutes,
                incrementMinutes: policy.incrementMinutes,
                maxDurationMinutes: policy.maxDurationMinutes
            } : null
        });
    }
    return Response.json({ ok: true, services: visible });
}
