import { db } from "@/app/lib/tags-db";

function generateCode() {

    return Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();
}

export async function createQr({

    business_id,
    product_id,
    event_id = null,
    label = null,
    value = null,
    final_url = null

}) {

    const conn =
        await db.getConnection();

    try {

        let code;
        let exists = true;

        // =========================
        // UNIQUE CODE
        // =========================

        while (exists) {

            code =
                generateCode();

            const [check] =
                await conn.execute(
                    `
                    SELECT id
                    FROM tags_qr_codes
                    WHERE code = ?
                    LIMIT 1
                    `,
                    [code]
                );

            exists =
                check.length > 0;
        }

        // =========================
        // CREATE QR
        // =========================

        const [result] =
            await conn.execute(
                `
                INSERT INTO tags_qr_codes (

                    business_id,
                    code,
                    label,
                    created_at,
                    value,
                    final_url,
                    status,
                    tracking_enabled,
                    product_id,
                    event_id,
                    is_active

                )

                VALUES (

                    ?,
                    ?,
                    ?,
                    NOW(),
                    ?,
                    ?,
                    'active',
                    1,
                    ?,
                    ?,
                    1

                )
                `,
                [
                    business_id || null,
                    code,
                    label,
                    value,
                    final_url,
                    product_id,
                    event_id
                ]
            );

        return {

            id:
                result.insertId,

            code
        };

    } finally {

        conn.release();
    }
}