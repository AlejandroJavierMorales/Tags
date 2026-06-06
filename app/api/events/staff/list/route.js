export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

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
        // STAFF GLOBAL
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    id,
                    name,
                    email,
                    phone,

                    role,
                    permissions,

                    status,

                    last_login_at,
                    created_at

                FROM tags_events_staff

                WHERE
                    business_id = ?

                ORDER BY id DESC
                `,
                [
                    session.businessId
                ]
            );

        // =========================
        // FORMAT
        // =========================

        const data =
            rows.map((item) => {

                let permissions = [];

                if (Array.isArray(item.permissions)) {

                    permissions = item.permissions;

                } else {

                    try {

                        permissions =
                            JSON.parse(
                                item.permissions || "[]"
                            );

                    } catch {

                        permissions = [];
                    }
                }

                return {

                    ...item,

                    permissions
                };
            });

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            data
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}