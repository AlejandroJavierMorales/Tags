import { cookies } from "next/headers";
import { verifyTagsSession } from "@/app/lib/signTagsSession";

export async function getQrAgencyAdminAccess(businessId) {
    const store = await cookies();
    const value = store.get("tags_session")?.value || "";
    const signature = store.get("tags_session_sig")?.value || "";

    if (!value || !verifyTagsSession(value, signature)) {
        return { allowed: false, status: 401, error: "No autenticado" };
    }

    let session;
    try {
        session = JSON.parse(value);
    } catch {
        return { allowed: false, status: 401, error: "Sesión inválida" };
    }

    const ownsBusiness = String(session.business_id || session.businessId || "") === String(businessId || "");
    if (session.role !== "admin" && !ownsBusiness) {
        return { allowed: false, status: 403, error: "Sin permisos" };
    }

    return { allowed: true, status: 200, session };
}

export function qrAgencyAdminError(access) {
    return Response.json({ ok: false, error: access.error || "Sin permisos" }, { status: access.status || 403 });
}
