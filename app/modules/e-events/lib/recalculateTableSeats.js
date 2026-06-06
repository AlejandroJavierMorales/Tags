// ========================================
// /api/events/tables/recalculateTableSeats.js
// ========================================

import { db }
    from "@/app/lib/tags-db";

export async function recalculateTableSeats(tableId) {

    const [rows] =
        await db.query(
            `
            SELECT

                COALESCE(
                    SUM(seats_reserved),
                    0
                ) AS total

            FROM tags_event_attendee_tables

            WHERE table_id = ?
            `,
            [tableId]
        );

    const total =
        rows[0]?.total || 0;

    await db.query(
        `
        UPDATE tags_event_tables

        SET seats_reserved = ?

        WHERE id = ?
        `,
        [
            total,
            tableId
        ]
    );
}