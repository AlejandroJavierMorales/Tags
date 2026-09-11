// =====================================
// API: /api/loyalty/admin/member/lookup
// Descripcion: Busca un miembro por el codigo de su QR personal.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getLoyaltyAdminScope, loyaltyApiError } from "@/app/modules/loyalty/lib/loyaltyAdminScope";
import { requireActiveLoyaltyAddon } from "@/app/modules/loyalty/lib/loyaltyAccess";
import { getMemberByCode } from "@/app/modules/loyalty/lib/loyaltyMemberService";
import { db } from "@/app/lib/tags-db";

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        const { businessId } = await getLoyaltyAdminScope(body?.business_id);
        await requireActiveLoyaltyAddon(businessId);

        const rawValue = String(body?.value || body?.member_code || "")
            .trim()
            .replace(/^tags-loyalty:/i, "");
        if (!rawValue) throw new Error("No se recibió un código de miembro");

        const member = await getMemberByCode(rawValue);
        if (!member) throw new Error("No encontramos un miembro con ese código");

        const [accountRows] = await db.query(
            `SELECT a.id AS account_id
               FROM tags_loyalty_accounts a
               INNER JOIN tags_loyalty_programs p ON p.id=a.program_id
              WHERE a.member_id=? AND p.business_id=? AND a.status='active'
              LIMIT 1`,
            [member.id, businessId]
        );

        return Response.json({
            success: true,
            member: {
                id: member.id,
                member_code: member.member_code,
                user_id: member.user_id,
                email: member.email,
                first_name: member.first_name,
                last_name: member.last_name,
                display_name: member.display_name,
                account_id: accountRows[0]?.account_id || null
            }
        });
    } catch (error) {
        console.error("LOYALTY MEMBER LOOKUP ERROR", error);
        return loyaltyApiError(error);
    }
}
