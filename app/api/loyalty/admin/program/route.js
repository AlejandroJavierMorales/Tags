// =====================================
// API: /api/loyalty/admin/program
// Descripcion: Consulta y guarda el programa de fidelizacion de un negocio.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getLoyaltyAdminScope, loyaltyApiError } from "@/app/modules/loyalty/lib/loyaltyAdminScope";
import { getProgramsByBusinessId, saveProgram } from "@/app/modules/loyalty/lib/loyaltyProgramService";
import { refreshDestinationBusinessProjection } from "@/app/modules/destination-ai/server/refreshDestinationBusinessProjection";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const { businessId } = await getLoyaltyAdminScope(searchParams.get("business_id"));
        const programs = await getProgramsByBusinessId(businessId);
        return Response.json({ success: true, businessId, programs, program: programs[0] || null });
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
            programId: body?.program_id || null,
            businessId,
            directorySiteId: body?.directory_site_id || null,
            stampAssetId: body?.stamp_asset_id || null,
            name: body?.name,
            description: body?.description,
            mechanic: body?.mechanic || "points",
            settings: body?.settings,
            status: body?.status || "active"
        });
        await refreshDestinationBusinessProjection(businessId).catch(error => console.error("DESTINATION PROJECTION LOYALTY PROGRAM SYNC ERROR", { businessId, error }));
        return Response.json({ success: true, program });
    } catch (error) {
        console.error("LOYALTY PROGRAM PUT ERROR", error);
        return loyaltyApiError(error);
    }
}
