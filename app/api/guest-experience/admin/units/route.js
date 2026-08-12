export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function POST(req) {
    const body = await req.json().catch(() => null); if (!body) return guestError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0);
    const access = await getGuestAdminAccess({ businessId, guestAppId }); if (!access.allowed) return guestAdminAccessResponse(access);
    const name = cleanGuestText(body.name, 190); if (!name) return guestError("El nombre de la unidad es requerido");
    const [result] = await db.query("INSERT INTO tags_guest_units (guest_app_id,code,name,description,capacity_adults,capacity_children) VALUES (?,?,?,?,?,?)", [guestAppId, cleanGuestText(body.code, 80) || null, name, cleanGuestText(body.description, 2000) || null, Math.max(1, Number(body.capacityAdults || 1)), Math.max(0, Number(body.capacityChildren || 0))]);
    return Response.json({ ok: true, unitId: result.insertId }, { status: 201 });
}
