// =====================================
// API: /api/loyalty/admin/movements
// Descripcion: Historial de movimientos del programa.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getLoyaltyAdminScope, loyaltyApiError } from "@/app/modules/loyalty/lib/loyaltyAdminScope";
import { requireActiveLoyaltyAddon } from "@/app/modules/loyalty/lib/loyaltyAccess";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const { businessId } = await getLoyaltyAdminScope(searchParams.get("business_id"));
        await requireActiveLoyaltyAddon(businessId);

        const search = String(searchParams.get("search") || "").trim();
        const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
        const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
        const params = [businessId];
        let searchSql = "";
        if (search) {
            searchSql = "AND (u.email_normalized LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR lm.member_code LIKE ?)";
            const term = `%${search}%`;
            params.push(term, term, term, term);
        }

        const [rows] = await db.query(
            `SELECT t.id,t.transaction_type,t.points_delta,t.stamps_delta,t.visits_delta,
                    t.points_balance_after,t.stamps_balance_after,t.visits_balance_after,
                    t.amount,t.source,t.description,t.reference_type,t.reference_id,t.created_at,
                    lm.member_code,u.first_name,u.last_name,u.display_name,u.email
               FROM tags_loyalty_transactions t
               INNER JOIN tags_loyalty_programs p ON p.id=t.program_id AND p.business_id=?
               INNER JOIN tags_loyalty_members lm ON lm.id=t.member_id
               INNER JOIN tags_users u ON u.id=lm.user_id
              WHERE 1=1 ${searchSql}
              ORDER BY t.created_at DESC,t.id DESC
              LIMIT ${limit} OFFSET ${offset}`,
            params
        );

        return Response.json({ success: true, businessId, movements: rows });
    } catch (error) {
        console.error("LOYALTY MOVEMENTS GET ERROR", error);
        return loyaltyApiError(error);
    }
}
