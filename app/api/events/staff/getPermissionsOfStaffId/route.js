export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db } from "@/app/lib/tags-db";
import { getEventSession } from "@/app/modules/e-events/lib/geEventSession";

export async function GET() {

    try {

        // =========================
        // SESSION
        // =========================

        const session =
            await getEventSession();

        if (!session) {

            return Response.json(
                {
                    error: "Unauthorized"
                },
                {
                    status: 401
                }
            );
        }

        // =========================
        // STAFF ID
        // =========================

        const staffId =
            session.staffId;

        if (!staffId) {

            return Response.json(
                {
                    error: "StaffId no encontrado"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // GET STAFF
        // =========================

        const [staffRows] =
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


        if (!staffRows.length) {

            return Response.json(
                {
                    error: "Staff no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        // =========================
        // STAFF PERMISSIONS
        // =========================

        let staffPermissions = [];

        if (Array.isArray(staffRows[0].permissions)) {

            staffPermissions =
                staffRows[0].permissions;

        } else {

            try {

                staffPermissions =
                    JSON.parse(
                        staffRows[0].permissions || "[]"
                    );

            } catch {

                staffPermissions = [];
            }
        }

        // =========================
        // GET PERMISSIONS INFO
        // =========================

        let rows = [];

        if (staffPermissions.length > 0) {

            const placeholders =
                staffPermissions
                    .map(() => "?")
                    .join(",");

            const [permissionsRows] =
                await db.query(
                    `
                    SELECT

                        id,
                        code,
                        module_name,
                        description

                    FROM tags_events_permissions

                    WHERE code IN (${placeholders})

                    ORDER BY
                        module_name ASC,
                        description ASC
                    `,
                    staffPermissions
                );

            rows = permissionsRows;
        }

        // =========================
        // GROUP BY MODULE
        // =========================

        const modules = {};

        for (const row of rows) {

            if (!modules[row.module_name]) {

                modules[row.module_name] = [];
            }

            modules[row.module_name].push({

                id: row.id,

                code: row.code,

                description: row.description
            });
        }

        // =========================
        // FORMAT
        // =========================

        const permissions =
            Object.entries(modules).map(

                ([module, permissions]) => ({

                    module,

                    permissions
                })
            );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            data: permissions
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error: "Error interno"
            },
            {
                status: 500
            }
        );
    }
}