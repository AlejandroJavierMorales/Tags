// =====================================
// API: /api/loyalty/admin/redeem
// Descripcion: Confirma un canje de recompensa.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getLoyaltyAdminScope, loyaltyApiError } from "@/app/modules/loyalty/lib/loyaltyAdminScope";
import { redeemLoyaltyReward } from "@/app/modules/loyalty/lib/loyaltyRedemptionService";

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        const { businessId, session } = await getLoyaltyAdminScope(body?.business_id);
        const rewardId = Number(body?.reward_id || 0);
        const accountId = Number(body?.account_id || 0);
        if (!rewardId || !accountId) throw new Error("Recompensa y cuenta son obligatorias");
        const result = await redeemLoyaltyReward({ businessId, rewardId, accountId, performedByUserId: session?.userId || null, notes: body?.notes || null });
        return Response.json({ success: true, result });
    } catch (error) {
        console.error("LOYALTY REDEEM ERROR", error);
        return loyaltyApiError(error);
    }
}
