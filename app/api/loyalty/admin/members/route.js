// =====================================
// API: /api/loyalty/admin/members
// Descripcion: Lista miembros y progreso del programa del negocio.
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
            searchSql = `AND (u.email_normalized LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR lm.member_code LIKE ?)`;
            const term = `%${search}%`;
            params.push(term, term, term, term);
        }

        const [rows] = await db.query(
            `SELECT
                lm.id AS member_id,
                lm.member_code,
                u.id AS user_id,
                u.first_name,
                u.last_name,
                u.display_name,
                u.email,
                u.profile_image_url,
                a.id AS account_id,
                a.points_balance,
                a.stamps_balance,
                a.visits_balance,
                a.updated_at AS last_activity_at
             FROM tags_loyalty_programs p
             INNER JOIN tags_loyalty_accounts a ON a.program_id=p.id
             INNER JOIN tags_loyalty_members lm ON lm.id=a.member_id
             INNER JOIN tags_users u ON u.id=lm.user_id
             WHERE p.business_id=? ${searchSql}
             ORDER BY a.updated_at DESC, lm.id DESC
             LIMIT ${limit} OFFSET ${offset}`,
            params
        );

        return Response.json({ success: true, businessId, members: rows });
    } catch (error) {
        console.error("LOYALTY MEMBERS GET ERROR", error);
        return loyaltyApiError(error);
    }
}
