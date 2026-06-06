// =====================================
// LIB: canActivateQRPage
// Descripción: Valida si un cliente puede crear/activar una nueva QR-Page según addons contratados.
// =====================================

import { db } from "@/app/lib/tags-db";

export async function canActivateQRPage({
    businessId,
    qrCodeId
}) {
    if (!businessId) {
        return {
            ok: false,
            status: 400,
            error: "businessId requerido"
        };
    }

    if (!qrCodeId) {
        return {
            ok: false,
            status: 400,
            error: "qrCodeId requerido"
        };
    }

    const [businessRows] = await db.query(
        `
        SELECT
            id,
            name,
            email,
            subscription_status
        FROM
            tags_businesses
        WHERE
            id = ?
        LIMIT 1
        `,
        [businessId]
    );

    const business = businessRows[0];

    if (!business) {
        return {
            ok: false,
            status: 404,
            error: "Cliente no encontrado"
        };
    }

    const [qrRows] = await db.query(
        `
        SELECT
            id,
            business_id,
            has_qr_page
        FROM
            tags_qr_codes
        WHERE
            id = ?
            AND business_id = ?
        LIMIT 1
        `,
        [
            qrCodeId,
            businessId
        ]
    );

    const qr = qrRows[0];

    if (!qr) {
        return {
            ok: false,
            status: 404,
            error: "QR no encontrado para este cliente"
        };
    }

    const [existingPageRows] = await db.query(
        `
        SELECT
            id
        FROM
            tags_qr_pages
        WHERE
            business_id = ?
            AND qr_code_id = ?
        LIMIT 1
        `,
        [
            businessId,
            qrCodeId
        ]
    );

    if (existingPageRows.length) {
        return {
            ok: true,
            business,
            qr,
            alreadyExists: true
        };
    }

    const [addonRows] = await db.query(
        `
        SELECT
            COALESCE(SUM(quantity), 0) AS total_allowed
        FROM
            tags_business_addons
        WHERE
            business_id = ?
            AND addon_code = 'qr_page'
            AND status = 'active'
            AND (
                expires_at IS NULL
                OR expires_at >= NOW()
            )
        `,
        [businessId]
    );

    const totalAllowed =
        Number(addonRows[0]?.total_allowed || 0);

    const [usedRows] = await db.query(
        `
        SELECT
            COUNT(*) AS total_used
        FROM
            tags_qr_pages
        WHERE
            business_id = ?
            AND qr_code_id IS NOT NULL
            AND status IN ('draft', 'published')
        `,
        [businessId]
    );

    const totalUsed =
        Number(usedRows[0]?.total_used || 0);

    if (totalAllowed <= totalUsed) {
        return {
            ok: false,
            status: 403,
            error: "El cliente no tiene cupo disponible para activar otra QR-Page",
            totalAllowed,
            totalUsed
        };
    }

    return {
        ok: true,
        business,
        qr,
        alreadyExists: false,
        totalAllowed,
        totalUsed,
        available: totalAllowed - totalUsed
    };
}