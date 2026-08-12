import { db } from "@/app/lib/tags-db";
import { getPublicResto } from "@/app/modules/resto/lib/getPublicResto";

export async function getDirectoryEmbeddedResto(businessId) {
    if (!businessId) return null;

    const [rows] = await db.query(`
        SELECT p.slug
        FROM tags_stores s
        INNER JOIN tags_qr_pages p
            ON p.id = s.page_id
            AND p.page_type = 'resto'
        INNER JOIN tags_business_addons ba
            ON ba.business_id = s.business_id
            AND ba.addon_code = 'resto'
            AND ba.status = 'active'
            AND (ba.expires_at IS NULL OR ba.expires_at >= NOW())
        WHERE s.business_id = ?
        AND s.app_type = 'resto'
        ORDER BY s.id DESC
        LIMIT 1
    `, [businessId]);

    const slug = rows?.[0]?.slug;
    if (!slug) return null;

    return getPublicResto(slug, { allowDirectoryEmbedding: true });
}
