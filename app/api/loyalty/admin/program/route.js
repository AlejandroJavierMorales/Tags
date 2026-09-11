// =====================================
// API: /api/loyalty/admin/program
// Descripcion: Consulta y guarda el programa de fidelizacion de un negocio.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getLoyaltyAdminScope, loyaltyApiError } from "@/app/modules/loyalty/lib/loyaltyAdminScope";
import { getProgramByBusinessId, saveProgram } from "@/app/modules/loyalty/lib/loyaltyProgramService";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const { businessId } = await getLoyaltyAdminScope(searchParams.get("business_id"));
        const program = await getProgramByBusinessId(businessId);
        return Response.json({ success: true, businessId, program });
    } catch (error) {
        console.error("LOYALTY PROGRAM GET ERROR", error);
        return loyaltyApiError(error);
    }
}

export async function PUT(request) {
    try {
        const body = await request.json().catch(() => null);
        const { businessId } = await getLoyaltyAdminScope(body?.business_id);
        const program = await saveProgram({
            businessId,
            directorySiteId: body?.directory_site_id || null,
            name: body?.name,
            description: body?.description,
            mechanic: body?.mechanic || "points",
            settings: body?.settings,
            status: body?.status || "active"
        });
        return Response.json({ success: true, program });
    } catch (error) {
        console.error("LOYALTY PROGRAM PUT ERROR", error);
        return loyaltyApiError(error);
    }
}
