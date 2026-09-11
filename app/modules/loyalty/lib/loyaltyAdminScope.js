// =====================================
// MODULE: Tags Fidelizacion
// Descripcion: Resuelve el negocio permitido para una operacion administrativa.
// =====================================

import { getSessionBusiness } from "@/app/lib/getSessionBusiness";

export async function getLoyaltyAdminScope(requestedBusinessId = null) {
    const session = await getSessionBusiness();
    if (!session) {
        const error = new Error("No autenticado");
        error.status = 401;
        throw error;
    }

    if (session.role === "admin") {
        const businessId = Number(requestedBusinessId || 0);
        if (!businessId) {
            const error = new Error("business_id requerido para el administrador de Tags");
            error.status = 400;
            throw error;
        }
        return { session, businessId };
    }

    if (!session.id) {
        const error = new Error("La sesión no tiene un negocio asociado");
        error.status = 403;
        throw error;
    }

    if (requestedBusinessId && Number(requestedBusinessId) !== Number(session.id)) {
        const error = new Error("No tenés permiso para este negocio");
        error.status = 403;
        throw error;
    }

    return { session, businessId: Number(session.id) };
}

export function loyaltyApiError(error) {
    const status = Number(error?.status || 500);
    return Response.json(
        { success: false, error: status >= 500 ? "No se pudo completar la operación" : error.message },
        { status }
    );
}
