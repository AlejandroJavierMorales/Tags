export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db } from "@/app/lib/tags-db";
import { getLoyaltyAdminScope, loyaltyApiError } from "@/app/modules/loyalty/lib/loyaltyAdminScope";
import { requireActiveLoyaltyAddon } from "@/app/modules/loyalty/lib/loyaltyAccess";

export async function GET(request) {
  try {
    const requested = new URL(request.url).searchParams.get("business_id");
    const { businessId } = await getLoyaltyAdminScope(requested);
    await requireActiveLoyaltyAddon(businessId);
    const [[summary]] = await db.query(`SELECT
      (SELECT COUNT(*) FROM tags_loyalty_members lm INNER JOIN tags_loyalty_accounts a ON a.member_id=lm.id AND a.status='active' INNER JOIN tags_loyalty_programs p ON p.id=a.program_id WHERE p.business_id=? AND lm.status='active') members,
      (SELECT COUNT(*) FROM tags_loyalty_claims WHERE business_id=? AND status='pending') pending_claims,
      (SELECT COUNT(*) FROM tags_loyalty_claims WHERE business_id=? AND status='confirmed' AND created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)) confirmed_30d,
      (SELECT COUNT(*) FROM tags_loyalty_redemptions rd INNER JOIN tags_loyalty_programs p ON p.id=rd.program_id WHERE p.business_id=? AND rd.created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)) redemptions_30d`, [businessId,businessId,businessId,businessId]);
    const [rewards] = await db.query(`SELECT r.name,COUNT(rd.id) redemptions FROM tags_loyalty_rewards r INNER JOIN tags_loyalty_programs p ON p.id=r.program_id LEFT JOIN tags_loyalty_redemptions rd ON rd.reward_id=r.id WHERE p.business_id=? GROUP BY r.id,r.name ORDER BY redemptions DESC,r.name LIMIT 10`, [businessId]);
    return Response.json({ success: true, summary: summary || {}, rewards });
  } catch (error) { return loyaltyApiError(error); }
}
