import { db } from "@/app/lib/tags-db";

import {
    EVENT_PERMISSIONS
}
from "@/app/lib/eventPermissions";

export async function validateEventPermission({

    businessId,
    eventId,
    permission

}) {

    const allowedRoles =
        EVENT_PERMISSIONS[
            permission
        ] || [];

    if (!allowedRoles.length) {

        return null;
    }

    const [rows] =
        await db.query(
            `
            SELECT *

            FROM tags_event_users

            WHERE

                business_id = ?
            AND
                event_id = ?
            AND
                status = 'active'
            AND
                role IN (${allowedRoles.map(() => "?").join(",")})

            LIMIT 1
            `,
            [
                businessId,
                eventId,
                ...allowedRoles
            ]
        );

    return rows[0] || null;
}