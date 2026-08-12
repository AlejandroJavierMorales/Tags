export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTurnosBySlug, getPublicLocations } from "@/app/modules/turnos/lib/getTurnosPublic";
import { jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const slug = new URL(req.url).searchParams.get("slug");
    const app = await getTurnosBySlug(slug);
    if (!app) return jsonResponseError("Página de Turnos no encontrada", 404, "TURNOS_NOT_FOUND");
    const locations = await getPublicLocations(app.id);
    return Response.json({
        ok: true,
        app: {
            id: app.id,
            slug: app.slug,
            name: app.name,
            profile: app.business_profile_code,
            timezone: app.timezone,
            currency: app.currency,
            page: app.page,
            publicBookingPolicy: app.publicBookingPolicy
        },
        locations
    });
}

