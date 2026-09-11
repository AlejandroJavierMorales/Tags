import { db } from "@/app/lib/tags-db";
import { getTurnosAccess } from "@/app/modules/turnos/lib/access/getTurnosAccess";

export async function getSportsAccess({ businessId, turnosId, permission = null }) {
    const access = await getTurnosAccess({ businessId, turnosId, permission });
    if (!access.allowed) return { ...access, sportsApp: null };

    const [rows] = await db.query(
        `SELECT sa.*, ta.slug, ta.status AS turnos_status
         FROM tags_sports_apps sa
         INNER JOIN tags_turnos_apps ta ON ta.id = sa.turnos_id AND ta.business_id = sa.business_id
         WHERE sa.business_id = ? AND sa.turnos_id = ?
         LIMIT 1`,
        [businessId, turnosId]
    );
    if (!rows[0]) return { ...access, allowed: false, status: 404, sportsApp: null };
    return { ...access, sportsApp: rows[0] };
}

