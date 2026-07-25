import {
    db
} from "@/app/lib/tags-db";

export function roundCash(value) {

    const number =
        Number(value);

    return Math.round(
        (
            (
                Number.isFinite(number)
                    ? number
                    : 0
            ) +
            Number.EPSILON
        ) *
        100
    ) / 100;

}

export function getCashActor(req) {

    let session = {};

    try {

        session =
            JSON.parse(
                req.cookies.get(
                    "tags_session"
                )?.value ||
                "{}"
            );

    } catch {
        session = {};
    }

    const id =
        Number(
            session.user_id ||
            session.userId ||
            session.id
        ) ||
        null;

    const name =
        String(
            session.name ||
            session.email ||
            session.username ||
            ""
        ).trim() ||
        null;

    return {
        id,
        name
    };

}

export async function getRestoCashStore(
    connection,
    businessId,
    {
        lock = false
    } = {}
) {

    const [
        rows
    ] =
        await connection.query(
            `
            SELECT
                id,
                business_id,
                name,
                status
            FROM tags_stores
            WHERE business_id = ?
            AND app_type = 'resto'
            LIMIT 1
            ${lock ? "FOR UPDATE" : ""}
            `,
            [
                businessId
            ]
        );

    return rows[0] || null;

}

export async function ensurePrimaryCashRegister(
    connection,
    storeId
) {

    const [
        rows
    ] =
        await connection.query(
            `
            SELECT *
            FROM tags_resto_cash_registers
            WHERE store_id = ?
            AND is_active = 1
            ORDER BY id
            LIMIT 1
            `,
            [
                storeId
            ]
        );

    if (rows[0]) {
        return rows[0];
    }

    const [
        result
    ] =
        await connection.query(
            `
            INSERT INTO tags_resto_cash_registers (
                store_id,
                name,
                code,
                is_active,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                'Caja principal',
                'principal',
                1,
                NOW(),
                NOW()
            )
            `,
            [
                storeId
            ]
        );

    const [
        createdRows
    ] =
        await connection.query(
            `
            SELECT *
            FROM tags_resto_cash_registers
            WHERE id = ?
            LIMIT 1
            `,
            [
                result.insertId
            ]
        );

    return createdRows[0];

}

export async function getOpenCashShift(
    connection,
    storeId,
    {
        lock = false
    } = {}
) {

    const [
        rows
    ] =
        await connection.query(
            `
            SELECT
                cs.*,
                cr.name AS cash_register_name,
                cr.code AS cash_register_code
            FROM tags_resto_cash_shifts cs
            INNER JOIN tags_resto_cash_registers cr
                ON cr.id = cs.cash_register_id
            WHERE cs.store_id = ?
            AND cs.status = 'open'
            ORDER BY cs.opened_at DESC
            LIMIT 1
            ${lock ? "FOR UPDATE" : ""}
            `,
            [
                storeId
            ]
        );

    return rows[0] || null;

}

export async function getCashShiftSummary(
    connection,
    shift
) {

    if (!shift) {
        return null;
    }

    const [
        totalsRows
    ] =
        await connection.query(
            `
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN direction = 'income'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_income,
                COALESCE(
                    SUM(
                        CASE
                            WHEN direction = 'expense'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_expense,
                COALESCE(
                    SUM(
                        CASE
                            WHEN direction = 'income'
                            AND payment_method = 'cash'
                            THEN amount
                            WHEN direction = 'expense'
                            AND payment_method = 'cash'
                            THEN -amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS cash_movement_total,
                COUNT(*) AS movement_count
            FROM tags_resto_cash_movements
            WHERE cash_shift_id = ?
            `,
            [
                shift.id
            ]
        );

    const [
        methodRows
    ] =
        await connection.query(
            `
            SELECT
                payment_method,
                COALESCE(
                    SUM(
                        CASE
                            WHEN direction = 'income'
                            THEN amount
                            ELSE -amount
                        END
                    ),
                    0
                ) AS net_total
            FROM tags_resto_cash_movements
            WHERE cash_shift_id = ?
            GROUP BY payment_method
            ORDER BY payment_method
            `,
            [
                shift.id
            ]
        );

    const totals =
        totalsRows[0] || {};

    const openingAmount =
        roundCash(
            shift.opening_amount
        );

    const expectedCash =
        roundCash(
            openingAmount +
            roundCash(
                totals.cash_movement_total
            )
        );

    return {
        ...shift,
        opening_amount:
            openingAmount,
        total_income:
            roundCash(
                totals.total_income
            ),
        total_expense:
            roundCash(
                totals.total_expense
            ),
        net_total:
            roundCash(
                roundCash(totals.total_income) -
                roundCash(totals.total_expense)
            ),
        expected_cash:
            expectedCash,
        movement_count:
            Number(
                totals.movement_count ||
                0
            ),
        payment_methods:
            Object.fromEntries(
                methodRows.map(
                    row => [
                        row.payment_method,
                        roundCash(row.net_total)
                    ]
                )
            )
    };

}

export async function requireOpenCashShift(
    connection,
    storeId,
    {
        lock = false
    } = {}
) {

    const shift =
        await getOpenCashShift(
            connection,
            storeId,
            {
                lock
            }
        );

    if (!shift) {

        const error =
            new Error(
                "No hay una caja abierta. Abrí la caja antes de registrar el movimiento."
            );

        error.status =
            409;

        throw error;

    }

    return shift;

}

export {
    db
};
