export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function PATCH(req) {
    const body = await req.json().catch(() => null);
    if (!body) return guestError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0);
    const access = await getGuestAdminAccess({ businessId, guestAppId });
    if (!access.allowed) return guestAdminAccessResponse(access);
    const status = body.status === "published" ? "published" : "draft";
    await db.query("UPDATE tags_guest_apps SET status=?,updated_at=NOW() WHERE id=? AND business_id=?", [status, guestAppId, businessId]);
    return Response.json({ ok: true, status });
}
