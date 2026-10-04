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

    const [rows] =
        await db.query(
            `
            SELECT id

            FROM tags_events

            WHERE
                id = ?
            AND
                business_id = ?

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
