import { db } from "@/app/lib/tags-db";
import { getSessionBusiness } from "@/app/lib/getSessionBusiness";
import { GOOGLE_BUSINESS_ADDON_CODE } from "./googleBusinessConstants";

export async function getGoogleBusinessAdminAccess(requestedBusinessId) {
    const session = await getSessionBusiness();
    const businessId = Number(requestedBusinessId || 0);
    if (!session) return { allowed: false, status: 401, error: "No autenticado" };
    if (!businessId) return { allowed: false, status: 400, error: "Cliente invalido" };
    if (session.role !== "admin" && Number(session.id) !== businessId) {
        return { allowed: false, status: 403, error: "No tenes permiso para este negocio" };
    }
    const [rows] = await db.query(
        `SELECT id,business_id,addon_code,status,started_at,expires_at
           FROM tags_business_addons
          WHERE business_id=? AND addon_code=? AND status='active'
            AND (expires_at IS NULL OR expires_at>=NOW())
          ORDER BY id DESC LIMIT 1`,
        [businessId, GOOGLE_BUSINESS_ADDON_CODE]
    );
    if (!rows[0] && session.role !== "admin") {
        return { allowed: false, status: 403, error: "El negocio no tiene Tags Google Maps Profile activo" };
    }
    return { allowed: true, session, businessId, addon: rows[0] || null };
}

export function googleBusinessError(accessOrError) {
    const status = Number(accessOrError?.status || 500);
    return Response.json({ ok: false, error: status >= 500 ? "No se pudo completar la operacion" : accessOrError.error || accessOrError.message }, { status });
}
