// =====================================
// MODULE: Tags Fidelizacion
// Descripcion: Ledger atomico de puntos, sellos y visitas.
// =====================================

import { db } from "@/app/lib/tags-db";
import {
    LOYALTY_SOURCES,
    LOYALTY_TRANSACTION_TYPES
} from "./loyaltyConstants";
import { requireActiveLoyaltyAddon } from "./loyaltyAccess";

export async function postLoyaltyTransaction({
    businessId,
    accountId,
    transactionType,
    pointsDelta = 0,
    stampsDelta = 0,
    visitsDelta = 0,
    amount = null,
    source = "manual",
    referenceType = null,
    referenceId = null,
    description = null,
    performedByUserId = null,
    idempotencyKey = null,
    metadata = null
}) {
    if (!LOYALTY_TRANSACTION_TYPES.has(transactionType)) {
        throw new Error("Tipo de movimiento Loyalty no válido");
    }
    if (!LOYALTY_SOURCES.has(source)) {
        throw new Error("Origen de movimiento Loyalty no válido");
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await requireActiveLoyaltyAddon(businessId, connection);

        if (idempotencyKey) {
            const [existing] = await connection.query(
                `SELECT * FROM tags_loyalty_transactions
                  WHERE idempotency_key=? LIMIT 1`,
                [idempotencyKey]
            );
            if (existing[0]) {
                await connection.rollback();
                return existing[0];
            }
        }

        const [accountRows] = await connection.query(
            `SELECT a.*,p.business_id
               FROM tags_loyalty_accounts a
               INNER JOIN tags_loyalty_programs p ON p.id=a.program_id
              WHERE a.id=? AND p.business_id=?
              FOR UPDATE`,
            [accountId, businessId]
        );

        const account = accountRows[0];
        if (!account) throw new Error("Cuenta de fidelización no encontrada");

        const nextPoints = Number(account.points_balance || 0) + Number(pointsDelta || 0);
        const nextStamps = Number(account.stamps_balance || 0) + Number(stampsDelta || 0);
        const nextVisits = Number(account.visits_balance || 0) + Number(visitsDelta || 0);

        if (nextPoints < 0 || nextStamps < 0 || nextVisits < 0) {
            throw new Error("La operación no puede dejar un saldo negativo");
        }

        await connection.query(
            `UPDATE tags_loyalty_accounts
                SET points_balance=?,stamps_balance=?,visits_balance=?,updated_at=NOW()
              WHERE id=?`,
            [nextPoints, nextStamps, nextVisits, account.id]
        );

        const [result] = await connection.query(
            `INSERT INTO tags_loyalty_transactions
                (account_id,program_id,member_id,transaction_type,
                 points_delta,stamps_delta,visits_delta,
                 points_balance_after,stamps_balance_after,visits_balance_after,
                 amount,source,reference_type,reference_id,description,
                 performed_by_user_id,idempotency_key,metadata_json)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                account.id,
                account.program_id,
                account.member_id,
                transactionType,
                pointsDelta,
                stampsDelta,
                visitsDelta,
                nextPoints,
                nextStamps,
                nextVisits,
                amount,
                source,
                referenceType,
                referenceId,
                description,
                performedByUserId,
                idempotencyKey,
                JSON.stringify(metadata || {})
            ]
        );

        await connection.commit();

        const [rows] = await db.query(
            `SELECT * FROM tags_loyalty_transactions WHERE id=? LIMIT 1`,
            [result.insertId]
        );
        return rows[0] || null;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
