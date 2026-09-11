export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getLoyaltyAdminScope, loyaltyApiError } from "@/app/modules/loyalty/lib/loyaltyAdminScope";
import { getProgramByBusinessId } from "@/app/modules/loyalty/lib/loyaltyProgramService";
import { getActiveMerchantCode, merchantQrValue, rotateMerchantCode } from "@/app/modules/loyalty/lib/loyaltyMerchantCodeService";

function view(item) {
    return item ? { id:item.id,accessCode:item.access_code,qrValue:merchantQrValue(item),expiresAt:item.expires_at } : null;
}

export async function GET(request) {
    try {
        const businessIdParam = new URL(request.url).searchParams.get("business_id");
        const { businessId, session } = await getLoyaltyAdminScope(businessIdParam);
        const program = await getProgramByBusinessId(businessId);
        if (!program) throw new Error("Primero configurá el programa de fidelización");
        const current = await getActiveMerchantCode(businessId) || await rotateMerchantCode({ businessId, programId:program.id, userId:session?.userId });
        return Response.json({ success:true, code:view(current) });
    } catch (error) { return loyaltyApiError(error); }
}

export async function POST(request) {
    try {
        const body = await request.json().catch(()=>null);
        const { businessId, session } = await getLoyaltyAdminScope(body?.business_id);
        const program = await getProgramByBusinessId(businessId);
        if (!program) throw new Error("Primero configurá el programa de fidelización");
        const current = await rotateMerchantCode({ businessId, programId:program.id, userId:session?.userId });
        return Response.json({ success:true,code:view(current) });
    } catch (error) { return loyaltyApiError(error); }
}
