import { redirect }
    from "next/navigation";

import { db }
    from "@/app/lib/tags-db";

export async function requireEventOwnership(
    session,
    eventId
) {

    // admin bypass
    if (
        session.role === "admin"
    ) {

        return true;
    }

    if (session.type === "event_staff") {
        const [assignments] =
            await db.query(
                `
                SELECT es.event_id
                FROM tags_events_event_staff es
                INNER JOIN tags_events_staff staff
                    ON staff.id = es.staff_id
                    AND staff.status = 'active'
                WHERE es.event_id = ?
                    AND es.staff_id = ?
                    AND staff.business_id = ?
                LIMIT 1
                `,
                [
                    eventId,
                    Number(session.staffId || 0),
                    Number(session.businessId || 0)
                ]
            );

        if (!assignments[0]) {
            redirect("/dashboard/events");
        }

        return true;
    }

    if (session.type === "business_staff") {
        const [[row]] = await db.query(`SELECT e.id FROM tags_events e INNER JOIN tags_business_staff_app_access aa ON aa.business_id=e.business_id AND aa.staff_id=? AND aa.app_code=e.product_code AND aa.status='active' WHERE e.id=? AND e.business_id=? LIMIT 1`, [Number(session.staffId || 0), Number(eventId || 0), Number(session.businessId || 0)]);
        if (!row) redirect("/dashboard/businesses/" + Number(session.businessId || 0));
        return true;
    }

    const [rows] =
        await db.query(
            `
            SELECT e.id

            FROM tags_events e

            WHERE
                e.id = ?
            AND
                e.business_id = ?
            AND EXISTS (
                SELECT 1
                FROM tags_business_addons ba
                WHERE ba.business_id=e.business_id
                  AND TRIM(LOWER(ba.addon_code))=e.product_code
                  AND ba.status='active'
                  AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())
            )

            LIMIT 1
            `,
            [
                eventId,
                session.businessId
            ]
        );

    if (!rows[0]) {

        redirect(
            "/dashboard/events"
        );
    }

    return true;
}
