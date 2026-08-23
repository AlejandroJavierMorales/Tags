import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";
import { verifyTagsSession } from "@/app/lib/signTagsSession";

export async function getAiChatAdminAccess(businessId) {
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

    const [addons] = await db.query(
        `SELECT id,status,expires_at
         FROM tags_business_addons
         WHERE business_id=? AND addon_code='ai_chatbot' AND status='active'
           AND (expires_at IS NULL OR expires_at>=NOW())
         LIMIT 1`,
        [businessId]
    );

    if (!addons.length) {
        return { allowed: false, status: 403, error: "El Chatbot con IA no está contratado o está vencido", session };
    }

    return { allowed: true, status: 200, session, addon: addons[0] };
}

export function aiChatAdminError(access) {
    return Response.json({ ok: false, error: access.error || "Sin permisos" }, { status: access.status || 403 });
}
