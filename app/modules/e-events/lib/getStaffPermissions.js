// app/modules/e-events/lib/getStaffPermissions.js

import { db } from "@/app/lib/tags-db";

export async function getStaffPermissions(staffId) {

    try {

        if (!staffId) {

            return [];
        }

        // =========================
        // GET STAFF
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT
                    permissions

                FROM tags_events_staff

                WHERE id = ?

                LIMIT 1
                `,
                [staffId]
            );

        if (!rows.length) {

            return [];
        }

        // =========================
        // NORMALIZE
        // =========================

        let permissions = [];

        if (
            Array.isArray(rows[0].permissions)
        ) {

            permissions =
                rows[0].permissions;

        } else {

            try {

                permissions =
                    JSON.parse(
                        rows[0].permissions || "[]"
                    );

            } catch {

                permissions = [];
            }
        }

        return permissions;

    } catch (err) {

        console.log(
            "getStaffPermissions error =>",
            err
        );

        return [];
    }
}