import { db } from "@/app/lib/tags-db";

export async function disableQRAddonUsage({
    conn = null,
    qrCodeId,
    addonCode
}) {
    const executor =
        conn || db;

    if (!qrCodeId || !addonCode) {
        throw new Error(
            "qrCodeId y addonCode son requeridos"
        );
    }

    await executor.query(
        `
        UPDATE tags_qr_addon_usage
        SET
            status = 'inactive',
            updated_at = NOW()
        WHERE qr_code_id = ?
        AND addon_code = ?
        `,
        [
            qrCodeId,
            addonCode
        ]
    );
}