// =====================================
// FILE: app/modules/qr/lib/createAppQRCode.js
// Descripción: Crea un QR digital automático para una aplicación del Workspace.
// =====================================

import { canCreateQR }
    from "@/app/modules/qr-page/lib/canCreateQR";

function generateCode() {
    return Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();
}

async function generateUniqueCode(conn) {
    let code;
    let exists = true;

    while (exists) {
        code = generateCode();

        const [rows] =
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
            rows.length > 0;
    }

    return code;
}

export async function createAppQRCode({
    conn,
    businessId,
    productId = 40,
    label,
    value = null,
    finalUrl = null,
    status = "active"
}) {
    if (!conn) {
        throw new Error("conn requerido");
    }

    if (!businessId) {
        throw new Error("businessId requerido");
    }

    if (!label) {
        throw new Error("label requerido");
    }

    const canCreate =
        await canCreateQR({
            businessId,
            quantity: 1
        });

    if (!canCreate.ok) {
        const err =
            new Error(canCreate.error || "No se puede crear QR");

        err.status =
            canCreate.status || 400;

        throw err;
    }

    const [productRows] =
        await conn.execute(
            `
            SELECT
                p.*,
                t.code AS qr_type_code
            FROM tags_products p
            LEFT JOIN tags_qr_types t
                ON t.id = p.qr_type_id
            WHERE p.id = ?
            LIMIT 1
            `,
            [productId]
        );

    const product =
        productRows[0];

    if (!product) {
        throw new Error("Producto QR inválido");
    }

    if (Number(product.is_digital) !== 1) {
        throw new Error("createAppQRCode requiere un producto digital");
    }

    const code =
        await generateUniqueCode(conn);

    await conn.execute(
        `
        INSERT INTO tags_qr_codes (
            business_id,
            code,
            label,
            is_active,
            created_at,
            value,
            final_url,
            status,
            tracking_enabled,
            product_id,
            has_qr_page
        )
        VALUES (?, ?, ?, 1, NOW(), ?, ?, ?, 1, ?, 0)
        `,
        [
            businessId,
            code,
            label,
            value,
            finalUrl,
            status,
            productId
        ]
    );

    const [qrRows] =
        await conn.execute(
            `
            SELECT *
            FROM tags_qr_codes
            WHERE code = ?
            LIMIT 1
            `,
            [code]
        );

    return qrRows[0];
}