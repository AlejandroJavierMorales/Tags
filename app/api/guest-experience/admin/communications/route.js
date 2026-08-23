export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function DELETE(req) {
    const body = await req.json().catch(() => null);
    if (!body) return guestError("Cuerpo JSON inválido");

    const businessId = Number(body.businessId || 0);
    const guestAppId = Number(body.guestAppId || 0);
    const communicationId = Number(body.communicationId || 0);
    if (!communicationId) return guestError("Comunicación inválida", 400);

    const access = await getGuestAdminAccess({ businessId, guestAppId });
    if (!access.allowed) return guestAdminAccessResponse(access);

    const [result] = await db.query(
        "DELETE FROM tags_guest_communications WHERE id=? AND guest_app_id=? AND direction='outbound'",
        [communicationId, guestAppId]
    );
    if (!result.affectedRows) return guestError("Comunicación no encontrada", 404);
    return Response.json({ ok: true });
}
