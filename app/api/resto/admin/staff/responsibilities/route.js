export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getRestoAccess, restoAccessResponse } from "@/app/modules/resto/lib/staff/getRestoAccess";

export async function GET(req) {
    const businessId = new URL(req.url).searchParams.get("businessId");
    const access = await getRestoAccess({ businessId });

    if (!access.allowed) {
        return restoAccessResponse(access);
    }

    if (access.isOwner) {
        return Response.json({ ok: true, isOwner: true, assignedLocationIds: [], notificationPreferences: {} });
    }

    const staffId = Number(access.session?.staffId || 0);
    const storeId = Number(access.session?.storeId || 0);
    const [[assignments], [preferences]] = await Promise.all([
        db.query(`
            SELECT location_id
            FROM tags_resto_staff_location_assignments
            WHERE store_id = ? AND staff_id = ? AND is_active = 1
        `, [storeId, staffId]),
        db.query(`
            SELECT notification_code, scope
            FROM tags_resto_staff_notification_preferences
            WHERE store_id = ? AND staff_id = ?
        `, [storeId, staffId])
    ]);

    return Response.json({
        ok: true,
        isOwner: false,
        assignedLocationIds: assignments.map(item => Number(item.location_id)),
        notificationPreferences: preferences.reduce((result, item) => ({
            ...result,
            [item.notification_code]: item.scope
        }), {})
    });
}
