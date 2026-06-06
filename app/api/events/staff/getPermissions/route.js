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
        // GET PERMISSIONS
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    id,
                    code,
                    module_name,
                    description

                FROM tags_events_permissions

                ORDER BY
                    module_name ASC,
                    description ASC
                `
            );

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