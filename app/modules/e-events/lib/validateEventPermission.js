import { db }
    from "@/app/lib/tags-db";

export async function validateEventPermission({

    staffId,
    eventId,
    permission

}) {

    const [rows] =
        await db.query(
            `
            SELECT
                s.permissions

            FROM tags_events_event_staff es

            INNER JOIN tags_events_staff s
                ON s.id = es.staff_id

            WHERE
                es.event_id = ?
            AND
                s.id = ?
            AND
                s.status = 'active'

            LIMIT 1
            `,
            [
                eventId,
                staffId
            ]
        );

    const staff =
        rows[0];

    if (!staff) {

        return false;
    }

    let permissions = [];

    try {

        permissions =
            Array.isArray(staff.permissions)
                ? staff.permissions
                : JSON.parse(
                    staff.permissions || "[]"
                );

    } catch (err) {

        console.log(err);

        permissions = [];
    }

    // limpieza
    permissions =
        permissions.map(p =>
            String(p).trim()
        );

    const cleanPermission =
        String(permission).trim();

    console.log(
        "permissions =>",
        permissions
    );

    console.log(
        "permission =>",
        cleanPermission
    );

    return permissions.includes(
        cleanPermission
    );
}