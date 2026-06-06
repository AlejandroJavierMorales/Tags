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