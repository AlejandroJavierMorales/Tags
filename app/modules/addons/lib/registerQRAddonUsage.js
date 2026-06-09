import { db } from "@/app/lib/tags-db";

export async function registerQRAddonUsage({
    conn = null,
    qrCodeId,
    businessId,
    addonCode,
    sourceTable = null,
    sourceId = null
}) {
    const executor =
        conn || db;

    if (!qrCodeId || !businessId || !addonCode) {
        throw new Error(
            "qrCodeId, businessId y addonCode son requeridos"
        );
    }

    await executor.query(
        `
        INSERT INTO tags_qr_addon_usage (
            qr_code_id,
            business_id,
            addon_code,
            source_table,
            source_id,
            status,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())

        ON DUPLICATE KEY UPDATE
            business_id = VALUES(business_id),
            source_table = VALUES(source_table),
            source_id = VALUES(source_id),
            status = 'active',
            updated_at = NOW()
        `,
        [
            qrCodeId,
            businessId,
            addonCode,
            sourceTable,
            sourceId
        ]
    );
}