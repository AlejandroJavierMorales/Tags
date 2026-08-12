export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTurnosBySlug, getPublicServices } from "@/app/modules/turnos/lib/getTurnosPublic";
import { jsonResponseError } from "@/app/modules/turnos/lib/turnosService";

export async function GET(req) {
    const slug = new URL(req.url).searchParams.get("slug");
    const app = await getTurnosBySlug(slug);
    if (!app) return jsonResponseError("Página de Turnos no encontrada", 404, "TURNOS_NOT_FOUND");
    return Response.json({ ok: true, services: await getPublicServices(app.id) });
}

