import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";
import { verifyTagsSession } from "@/app/lib/signTagsSession";

export async function getGuestAdminAccess({ businessId, guestAppId = 0 } = {}) {
    const store = await cookies();
    const value = store.get("tags_session")?.value || "";
    const signature = store.get("tags_session_sig")?.value || "";
    if (!value || !verifyTagsSession(value, signature)) return { allowed: false, status: 401 };
    let session;
    try { session = JSON.parse(value); } catch { return { allowed: false, status: 401 }; }
    const allowed = session.role === "admin" || String(session.business_id || session.businessId || "") === String(businessId);
    if (!allowed) return { allowed: false, status: 403, session };
    if (guestAppId) {
        const [rows] = await db.query("SELECT id FROM tags_guest_apps WHERE id=? AND business_id=? LIMIT 1", [guestAppId, businessId]);
        if (!rows.length) return { allowed: false, status: 404, session };
    }
    return { allowed: true, status: 200, session };
}

export function guestAdminAccessResponse(access) {
    return Response.json({ ok: false, error: access.status === 401 ? "No autenticado" : access.status === 404 ? "Instancia no encontrada" : "Sin permisos" }, { status: access.status || 403 });
}
