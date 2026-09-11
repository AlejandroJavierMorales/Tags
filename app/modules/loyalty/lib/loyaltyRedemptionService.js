// =====================================
// MODULE: Tags Fidelizacion
// Descripcion: Canje atomico de recompensas y registro auditable.
// =====================================

import { db } from "@/app/lib/tags-db";
import { requireActiveLoyaltyAddon } from "./loyaltyAccess";

export async function redeemLoyaltyReward({ businessId, rewardId, accountId, performedByUserId = null, notes = null }) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await requireActiveLoyaltyAddon(businessId, connection);

        const [[reward]] = await connection.query(
            `SELECT r.*,p.business_id
               FROM tags_loyalty_rewards r
               INNER JOIN tags_loyalty_programs p ON p.id=r.program_id
              WHERE r.id=? AND p.business_id=? AND r.status='active'
                AND (r.valid_from IS NULL OR r.valid_from<=NOW())
                AND (r.valid_until IS NULL OR r.valid_until>=NOW())
              FOR UPDATE`,
            [rewardId, businessId]
        );
        if (!reward) throw new Error("Recompensa no encontrada o no vigente");

        const [[account]] = await connection.query(
            `SELECT a.* FROM tags_loyalty_accounts a
              WHERE a.id=? AND a.program_id=? AND a.status='active'
              FOR UPDATE`,
            [accountId, reward.program_id]
        );
        if (!account) throw new Error("Cuenta de fidelización no encontrada");

        const pointsCost = Number(reward.required_points || 0);
        const stampsCost = Number(reward.required_stamps || 0);
        const visitsCost = Number(reward.required_visits || 0);
        if (Number(account.points_balance) < pointsCost || Number(account.stamps_balance) < stampsCost || Number(account.visits_balance) < visitsCost) {
            throw new Error("El miembro todavía no alcanzó el progreso necesario");
        }

        const nextPoints = Number(account.points_balance) - pointsCost;
        const nextStamps = Number(account.stamps_balance) - stampsCost;
        const nextVisits = Number(account.visits_balance) - visitsCost;
        await connection.query(
            `UPDATE tags_loyalty_accounts SET points_balance=?,stamps_balance=?,visits_balance=?,updated_at=NOW() WHERE id=?`,
            [nextPoints, nextStamps, nextVisits, account.id]
        );

        const [transactionResult] = await connection.query(
            `INSERT INTO tags_loyalty_transactions
                (account_id,program_id,member_id,transaction_type,points_delta,stamps_delta,visits_delta,points_balance_after,stamps_balance_after,visits_balance_after,source,reference_type,reference_id,description,performed_by_user_id,metadata_json)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [account.id, account.program_id, account.member_id, "REDEEM", -pointsCost, -stampsCost, -visitsCost, nextPoints, nextStamps, nextVisits, "admin", "reward", String(reward.id), `Canje: ${reward.name}`, performedByUserId, JSON.stringify({ rewardId: reward.id })]
        );

        const [redemptionResult] = await connection.query(
            `INSERT INTO tags_loyalty_redemptions
                (reward_id,program_id,account_id,member_id,status,redeemed_by_user_id,transaction_id,notes)
             VALUES (?,?,?,?, 'confirmed',?,?,?)`,
            [reward.id, reward.program_id, account.id, account.member_id, performedByUserId, transactionResult.insertId, notes]
        );

        await connection.commit();
        return { redemptionId: redemptionResult.insertId, transactionId: transactionResult.insertId, pointsBalance: nextPoints, stampsBalance: nextStamps, visitsBalance: nextVisits };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
