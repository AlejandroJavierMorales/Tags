import { db }
    from "@/app/lib/tags-db";

export async function calculateAttendeeSeats(
    attendeeId
) {

    const [rows] =
        await db.query(
            `
            SELECT COUNT(*) AS total

            FROM tags_event_attendee_companions

            WHERE attendee_id = ?
            `,
            [attendeeId]
        );

    const companions =
        Number(
            rows[0]?.total || 0
        );

    // titular + companions reales

    return 1 + companions;
}