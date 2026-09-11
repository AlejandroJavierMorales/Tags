// =====================================
// API: /api/loyalty/admin/rewards
// Descripcion: CRUD de recompensas de un programa Loyalty.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getLoyaltyAdminScope, loyaltyApiError } from "@/app/modules/loyalty/lib/loyaltyAdminScope";
import { requireActiveLoyaltyAddon } from "@/app/modules/loyalty/lib/loyaltyAccess";

const REWARD_TYPES = new Set(["percentage", "fixed_amount", "free_product", "free_service", "custom"]);

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const { businessId } = await getLoyaltyAdminScope(searchParams.get("business_id"));
        await requireActiveLoyaltyAddon(businessId);
        const [rows] = await db.query(
            `SELECT r.* FROM tags_loyalty_rewards r
             INNER JOIN tags_loyalty_programs p ON p.id=r.program_id
             WHERE p.business_id=?
             ORDER BY r.status='active' DESC,r.created_at DESC`,
            [businessId]
        );
        return Response.json({ success: true, rewards: rows });
    } catch (error) {
        console.error("LOYALTY REWARDS GET ERROR", error);
        return loyaltyApiError(error);
    }
}

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        const { businessId } = await getLoyaltyAdminScope(body?.business_id);
        await requireActiveLoyaltyAddon(businessId);
        const [[program]] = await db.query(`SELECT id FROM tags_loyalty_programs WHERE business_id=? LIMIT 1`, [businessId]);
        if (!program) throw new Error("Primero configurá el programa de fidelización");
        const name = String(body?.name || "").trim();
        const rewardType = String(body?.reward_type || "custom").trim();
        if (!name) throw new Error("La recompensa necesita un nombre");
        if (!REWARD_TYPES.has(rewardType)) throw new Error("Tipo de recompensa no válido");

        const [result] = await db.query(
            `INSERT INTO tags_loyalty_rewards
                (program_id,name,description,reward_type,reward_value,required_points,required_stamps,required_visits,status,valid_from,valid_until,settings_json)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                program.id,
                name,
                body?.description || null,
                rewardType,
                body?.reward_value === "" ? null : (body?.reward_value ?? null),
                body?.required_points === "" ? null : (body?.required_points ?? null),
                body?.required_stamps === "" ? null : (body?.required_stamps ?? null),
                body?.required_visits === "" ? null : (body?.required_visits ?? null),
                body?.status || "active",
                body?.valid_from || null,
                body?.valid_until || null,
                JSON.stringify(body?.settings || {})
            ]
        );
        const [[reward]] = await db.query(`SELECT * FROM tags_loyalty_rewards WHERE id=?`, [result.insertId]);
        return Response.json({ success: true, reward });
    } catch (error) {
        console.error("LOYALTY REWARDS POST ERROR", error);
        return loyaltyApiError(error);
    }
}

export async function PATCH(request) {
    try {
        const body = await request.json().catch(() => null);
        const { businessId } = await getLoyaltyAdminScope(body?.business_id);
        await requireActiveLoyaltyAddon(businessId);
        const rewardId = Number(body?.id || 0);
        if (!rewardId) throw new Error("Recompensa inválida");
        const fields = ["name", "description", "reward_type", "reward_value", "required_points", "required_stamps", "required_visits", "status", "valid_from", "valid_until"];
        const sets = [];
        const values = [];
        for (const field of fields) {
            if (Object.prototype.hasOwnProperty.call(body || {}, field)) {
                if (field === "reward_type" && !REWARD_TYPES.has(String(body[field]))) throw new Error("Tipo de recompensa no válido");
                sets.push(`${field}=?`);
                values.push(body[field] === "" ? null : body[field]);
            }
        }
        if (!sets.length) throw new Error("No hay cambios para guardar");
        values.push(rewardId, businessId);
        const [result] = await db.query(
            `UPDATE tags_loyalty_rewards r
             INNER JOIN tags_loyalty_programs p ON p.id=r.program_id
             SET ${sets.join(",")},r.updated_at=NOW()
             WHERE r.id=? AND p.business_id=?`,
            values
        );
        if (!result.affectedRows) throw new Error("Recompensa no encontrada");
        return Response.json({ success: true });
    } catch (error) {
        console.error("LOYALTY REWARDS PATCH ERROR", error);
        return loyaltyApiError(error);
    }
}

export async function DELETE(request) {
    const connection = await db.getConnection();
    try {
        const body = await request.json().catch(() => null);
        const { businessId } = await getLoyaltyAdminScope(body?.business_id);
        await requireActiveLoyaltyAddon(businessId, connection);
        const rewardId = Number(body?.id || 0);
        if (!rewardId) throw new Error("Recompensa inválida");

        await connection.beginTransaction();
        const [[reward]] = await connection.query(
            `SELECT r.id,r.program_id
               FROM tags_loyalty_rewards r
               INNER JOIN tags_loyalty_programs p ON p.id=r.program_id
              WHERE r.id=? AND p.business_id=?
              FOR UPDATE`,
            [rewardId, businessId]
        );
        if (!reward) throw new Error("Recompensa no encontrada");

        const [redemptions] = await connection.query(
            `SELECT id,account_id,transaction_id
               FROM tags_loyalty_redemptions
              WHERE reward_id=? AND program_id=?
              FOR UPDATE`,
            [rewardId, reward.program_id]
        );
        const [rewardTransactions] = await connection.query(
            `SELECT id,account_id
               FROM tags_loyalty_transactions
              WHERE program_id=? AND reference_type='reward' AND reference_id=?
              FOR UPDATE`,
            [reward.program_id, String(rewardId)]
        );
        const accountIds = [...new Set([
            ...redemptions.map(item => Number(item.account_id)),
            ...rewardTransactions.map(item => Number(item.account_id))
        ].filter(Boolean))];
        const transactionIds = [...new Set([
            ...redemptions.map(item => Number(item.transaction_id)),
            ...rewardTransactions.map(item => Number(item.id))
        ].filter(Boolean))];

        const [claimsDeleted] = await connection.query(
            "DELETE FROM tags_loyalty_claims WHERE business_id=? AND reward_id=?",
            [businessId, rewardId]
        );
        const [redemptionsDeleted] = await connection.query(
            "DELETE FROM tags_loyalty_redemptions WHERE reward_id=? AND program_id=?",
            [rewardId, reward.program_id]
        );
        let movementsDeleted = { affectedRows: 0 };
        if (transactionIds.length) {
            movementsDeleted = (await connection.query(
                `DELETE FROM tags_loyalty_transactions WHERE program_id=? AND id IN (${transactionIds.map(() => "?").join(",")})`,
                [reward.program_id, ...transactionIds]
            ))[0];
        }
        await connection.query("DELETE FROM tags_loyalty_rewards WHERE id=? AND program_id=?", [rewardId, reward.program_id]);

        for (const accountId of accountIds) {
            const [remaining] = await connection.query(
                `SELECT id,points_delta,stamps_delta,visits_delta
                   FROM tags_loyalty_transactions
                  WHERE account_id=? AND program_id=?
                  ORDER BY created_at,id
                  FOR UPDATE`,
                [accountId, reward.program_id]
            );
            let points = 0, stamps = 0, visits = 0;
            for (const movement of remaining) {
                points += Number(movement.points_delta || 0);
                stamps += Number(movement.stamps_delta || 0);
                visits += Number(movement.visits_delta || 0);
                await connection.query(
                    `UPDATE tags_loyalty_transactions
                        SET points_balance_after=?,stamps_balance_after=?,visits_balance_after=?
                      WHERE id=?`,
                    [points, stamps, visits, movement.id]
                );
            }
            await connection.query(
                `UPDATE tags_loyalty_accounts
                    SET points_balance=?,stamps_balance=?,visits_balance=?,updated_at=NOW()
                  WHERE id=? AND program_id=?`,
                [points, stamps, visits, accountId, reward.program_id]
            );
        }

        await connection.commit();
        return Response.json({
            success: true,
            deleted: {
                claims: claimsDeleted.affectedRows,
                redemptions: redemptionsDeleted.affectedRows,
                movements: movementsDeleted.affectedRows
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error("LOYALTY REWARD DELETE ERROR", error);
        return loyaltyApiError(error);
    } finally {
        connection.release();
    }
}
