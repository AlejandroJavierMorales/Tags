// =====================================
// API: /api/loyalty/member/summary
// Descripcion: Programas, saldos, recompensas y beneficios del usuario.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getSessionUser } from "@/app/modules/users/lib/userSession";

export async function GET(request) {
    const session = await getSessionUser();
    if (!session) return Response.json({ success: false, error: "No autenticado" }, { status: 401 });
    const [programs] = await db.query(
        `SELECT p.id AS program_id,p.name AS program_name,p.description AS program_description,p.mechanic,p.stamp_asset_id,
                b.id AS business_id,b.display_name AS business_name,b.logo_url AS business_logo,
                sa.image_url AS stamp_asset_url,
                a.id AS account_id,a.points_balance,a.stamps_balance,a.visits_balance
           FROM tags_loyalty_members lm
           INNER JOIN tags_loyalty_accounts a ON a.member_id=lm.id
           INNER JOIN tags_loyalty_programs p ON p.id=a.program_id AND p.status='active'
           INNER JOIN tags_businesses b ON b.id=p.business_id
           LEFT JOIN tags_loyalty_stamp_assets sa ON sa.id=p.stamp_asset_id AND sa.status='active'
          WHERE lm.user_id=?
          ORDER BY b.display_name,p.name`,
        [session.userId]
    );

    const [availablePrograms] = await db.query(
        `SELECT p.id AS program_id,p.name AS program_name,p.description AS program_description,p.mechanic,p.stamp_asset_id,
                b.id AS business_id,b.display_name AS business_name,b.logo_url AS business_logo,
                sa.image_url AS stamp_asset_url,
                EXISTS (
                    SELECT 1
                      FROM tags_loyalty_members lm
                      INNER JOIN tags_loyalty_accounts a ON a.member_id=lm.id AND a.program_id=p.id
                     WHERE lm.user_id=? AND lm.status='active'
                ) AS joined
           FROM tags_loyalty_programs p
           INNER JOIN tags_businesses b ON b.id=p.business_id
           LEFT JOIN tags_loyalty_stamp_assets sa ON sa.id=p.stamp_asset_id AND sa.status='active'
           INNER JOIN tags_business_addons ba
                   ON ba.business_id=p.business_id
                  AND ba.addon_code='loyalty'
                  AND ba.status='active'
                  AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())
          WHERE (
                p.directory_site_id IS NOT NULL
                OR EXISTS (
                    SELECT 1
                      FROM tags_directory_listings dl
                      INNER JOIN tags_directory_site_listings dsl ON dsl.listing_id=dl.id
                     WHERE dl.business_id=p.business_id
                )
            )
            AND p.status='active'
          ORDER BY b.display_name,p.name`,
        [session.userId]
    );

    const [rewards] = await db.query(
        `SELECT r.id,r.program_id,r.name,r.description,r.reward_type,r.reward_value,
                r.required_points,r.required_stamps,r.required_visits
           FROM tags_loyalty_members lm
           INNER JOIN tags_loyalty_accounts a ON a.member_id=lm.id
           INNER JOIN tags_loyalty_rewards r ON r.program_id=a.program_id AND r.status='active'
          WHERE lm.user_id=?
            AND (r.valid_from IS NULL OR r.valid_from<=NOW())
            AND (r.valid_until IS NULL OR r.valid_until>=NOW())
          ORDER BY r.created_at DESC`,
        [session.userId]
    );

    const [movements] = await db.query(
        `SELECT t.id,t.program_id,t.transaction_type,t.points_delta,t.stamps_delta,t.visits_delta,
                t.points_balance_after,t.stamps_balance_after,t.visits_balance_after,
                t.amount,t.source,t.description,t.created_at,
                p.name AS program_name,b.display_name AS business_name
           FROM tags_loyalty_members lm
           INNER JOIN tags_loyalty_transactions t ON t.member_id=lm.id
           INNER JOIN tags_loyalty_programs p ON p.id=t.program_id
           INNER JOIN tags_businesses b ON b.id=p.business_id
          WHERE lm.user_id=?
          ORDER BY t.created_at DESC,t.id DESC
          LIMIT 100`,
        [session.userId]
    );

    let networkBenefits = [];
    if (session.channelSiteId) {
        const [benefits] = await db.query(
            `SELECT db.id,db.name,db.description,db.benefit_type,db.benefit_value,
                    db.promotion_buy_quantity,db.promotion_pay_quantity,db.promotion_item,
                    db.valid_from,db.valid_until,db.image_url,db.validation_mode,
                    dl.display_name,b.id AS business_id,b.email,b.phone,b.whatsapp
               FROM tags_directory_benefits db
               INNER JOIN tags_directory_listings dl ON dl.id=db.listing_id
               INNER JOIN tags_businesses b ON b.id=db.business_id
              WHERE db.site_id=? AND db.visibility='public' AND db.is_active=1
                AND db.valid_from<=CURDATE() AND db.valid_until>=CURDATE()
              ORDER BY db.sort_order,db.name`,
            [session.channelSiteId]
        );
        networkBenefits = benefits;
    }

    return Response.json({ success: true, programs, availablePrograms, rewards, movements, networkBenefits });
}
