import { db } from "@/app/lib/tags-db";

export async function createEventLog({

    eventId,
    staffId,

    actionCode,

    entityType,
    entityId,

    description,

    metadata,

    req
}) {

    await db.query(
        `
        INSERT INTO tags_events_activity_logs (

            event_id,
            staff_id,

            action_code,

            entity_type,
            entity_id,

            description,

            metadata,

            ip,
            user_agent,

            created_at

        )

        VALUES (

            ?, ?,

            ?, 

            ?, ?,

            ?,

            ?,

            ?, ?,

            NOW()
        )
        `,
        [
            eventId,
            staffId,

            actionCode,

            entityType,
            entityId,

            description,

            JSON.stringify(
                metadata || {}
            ),

            req.headers.get(
                "x-forwarded-for"
            ) || "",

            req.headers.get(
                "user-agent"
            ) || ""
        ]
    );
}