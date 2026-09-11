import crypto from "crypto";
import { db } from "@/app/lib/tags-db";

function credentials() {
    return {
        accessCode: String(crypto.randomInt(100000, 1000000)),
        qrToken: crypto.randomBytes(32).toString("hex")
    };
}

export async function getActiveMerchantCode(businessId, connection = db) {
    const [rows] = await connection.query(
        `SELECT * FROM tags_loyalty_merchant_codes
          WHERE business_id=? AND status='active' AND expires_at>NOW()
          LIMIT 1`,
        [businessId]
    );
    return rows[0] || null;
}

export async function rotateMerchantCode({ businessId, programId, userId = null }, connection = db) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const { accessCode, qrToken } = credentials();
        try {
            const [updated] = await connection.query(
                `UPDATE tags_loyalty_merchant_codes
                    SET program_id=?,access_code=?,qr_token=?,status='active',expires_at=DATE_ADD(NOW(),INTERVAL 24 HOUR),created_by_user_id=?,updated_at=NOW()
                  WHERE business_id=?`,
                [programId, accessCode, qrToken, userId, businessId]
            );
            if (!updated.affectedRows) await connection.query(
                `INSERT INTO tags_loyalty_merchant_codes
                    (business_id,program_id,access_code,qr_token,status,expires_at,created_by_user_id)
                 VALUES (?,?,?,?,'active',DATE_ADD(NOW(),INTERVAL 24 HOUR),?)`,
                [businessId, programId, accessCode, qrToken, userId]
            );
            return getActiveMerchantCode(businessId, connection);
        } catch (error) {
            if (error?.code !== "ER_DUP_ENTRY") throw error;
        }
    }
    throw new Error("No se pudo generar un código único para el comercio");
}

export function merchantQrValue(item) {
    return item ? `tags-loyalty-business:${item.qr_token}` : null;
}
