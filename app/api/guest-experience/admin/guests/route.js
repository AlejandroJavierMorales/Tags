export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function POST(req) {
    const body = await req.json().catch(() => null); if (!body) return guestError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0);
    const access = await getGuestAdminAccess({ businessId, guestAppId }); if (!access.allowed) return guestAdminAccessResponse(access);
    const name = cleanGuestText(body.name, 190), email = cleanGuestText(body.email, 190).toLowerCase() || null, phone = cleanGuestText(body.phone, 60) || null;
    if (!name || (!email && !phone)) return guestError("Nombre y email o teléfono son requeridos");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return guestError("El email no tiene un formato válido");
    if (phone && phone.replace(/\D/g, "").length < 6) return guestError("El teléfono no tiene un formato válido");
    if (email) { const [same] = await db.query("SELECT name FROM tags_guest_people WHERE business_id=? AND email=? LIMIT 1", [businessId, email]); if (same[0]) return guestError(`El email ya pertenece a ${same[0].name}`, 409); }
    const [result] = await db.query("INSERT INTO tags_guest_people (business_id,name,email,phone,privacy_consent_at) VALUES (?,?,?,?,NOW())", [businessId, name, email, phone]);
    return Response.json({ ok: true, guestId: result.insertId }, { status: 201 });
}
