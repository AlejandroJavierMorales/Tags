// =====================================
// LIB: canCreateQR
// Descripción: Valida si un cliente puede crear/asignar más QRs según su plan activo.
// =====================================

import { db } from "@/app/lib/tags-db";

export async function canCreateQR({
    conn = null,
    businessId,
    quantity = 1,
    allowTrial = false
}) {

    if (!businessId) {

        return {
            ok: false,
            status: 400,
            error: "businessId requerido"
        };
    }

    const queryDb = conn || db;
    const [subs] =
        await queryDb.query(
            `
            SELECT
                s.*,
                p.max_qr_codes
            FROM
                tags_subscriptions s
            INNER JOIN
                tags_plans p
                    ON p.id = s.plan_id
            WHERE
                s.business_id = ?
                AND s.status IN ('active', 'trial')
                AND (? = 1 OR s.status = 'active')
                AND (s.expires_at IS NULL OR s.expires_at >= NOW())
            ORDER BY
                s.id DESC
            LIMIT 1
            `,
            [
                businessId,
                allowTrial ? 1 : 0
            ]
        );

    const subscription =
        subs[0];

    if (!subscription) {

        return {
            ok: false,
            status: 403,
            error: "El cliente no tiene suscripción activa"
        };
    }

    const [rows] =
        await db.query(
            `
            SELECT
                COUNT(*) AS total
            FROM
                tags_qr_codes
            WHERE
                business_id = ?
                AND is_active = 1
                AND status NOT IN ('deleted', 'disabled')
            `,
            [
                businessId
            ]
        );

    const currentTotal =
        Number(rows[0]?.total || 0);

    const maxAllowed =
        Number(subscription.max_qr_codes || 0);

    const nextTotal =
        currentTotal + Number(quantity);

    if (nextTotal > maxAllowed) {

        return {
            ok: false,
            status: 403,
            error:
                `El plan permite máximo ${maxAllowed} QRs`,
            currentTotal,
            maxAllowed
        };
    }

    return {
        ok: true,
        currentTotal,
        maxAllowed,
        available:
            maxAllowed - currentTotal
    };
}
