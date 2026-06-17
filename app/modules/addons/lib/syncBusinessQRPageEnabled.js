import { db } from "@/app/lib/tags-db";

export async function syncBusinessQRPageEnabled(businessId) {

    const id =
        Number(businessId);

    if (!id) {
        return false;
    }

    const [rows] =
        await db.query(
            `
            SELECT
                COUNT(*) AS total
            FROM
                tags_business_addons
            WHERE
                business_id = ?
                AND TRIM(LOWER(addon_code)) IN ('qr_page', 'tags_id', 'tagsid')
                AND status = 'active'
                AND (
                    expires_at IS NULL
                    OR expires_at >= CURDATE()
                )
            `,
            [
                id
            ]
        );

    const total =
        Number(rows[0]?.total || 0);

    const enabled =
        total > 0;

    const [updateResult] =
    await db.query(
        `
        UPDATE
            tags_businesses
        SET
            qr_page_enabled = ?,
            updated_at = NOW()
        WHERE
            id = ?
        `,
        [
            enabled ? 1 : 0,
            businessId
        ]
    );

/* console.log("UPDATE tags_businesses result:", updateResult); */
    return enabled;
}