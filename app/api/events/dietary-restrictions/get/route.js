// ============================================
// /api/e-events/dietary-restrictions/get/route.js
// ============================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

import { staffHasPermission }
    from "@/app/modules/e-events/lib/staffHasPermission";

export async function GET(req) {

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
        // PARAMS
        // =========================

        const { searchParams } =
            new URL(req.url);

        const id =
            searchParams.get("id");

        if (!id) {

            return Response.json(
                {
                    error:
                        "ID requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // QUERY
        // =========================

        const [rows] =
            await db.query(
                `
                SELECT

                    r.*,

                    e.business_id

                FROM
                tags_event_dietary_restrictions r

                LEFT JOIN tags_events e
                    ON e.id = r.event_id

                WHERE r.id = ?

                LIMIT 1
                `,
                [id]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Restricción no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const restriction =
            rows[0];

        // =========================
        // SECURITY
        // =========================

        if (
            restriction.is_system
        ) {

            if (
                session.role !== "admin"
            ) {

                const isOwner =

                    session.role === "event_client";

                if (!isOwner) {

                    if (
                        session.type !== "event_staff"
                    ) {

                        return Response.json(
                            {
                                error:
                                    "Sin permisos"
                            },
                            {
                                status: 403
                            }
                        );
                    }

                    const allowed =
                        await staffHasPermission(
                            session.staffId,
                            "dietary_restrictions.view"
                        );

                    if (!allowed) {

                        return Response.json(
                            {
                                error:
                                    "Sin permisos"
                            },
                            {
                                status: 403
                            }
                        );
                    }
                }
            }

        } else {

            const isOwner =

                session.role === "admin"
                ||
                session.role === "event_client";

            if (!isOwner) {

                if (
                    session.type !== "event_staff"
                ) {

                    return Response.json(
                        {
                            error:
                                "Sin permisos"
                        },
                        {
                            status: 403
                        }
                    );
                }

                const allowed =
                    await staffHasPermission(
                        session.staffId,
                        "dietary_restrictions.view"
                    );

                if (!allowed) {

                    return Response.json(
                        {
                            error:
                                "Sin permisos"
                        },
                        {
                            status: 403
                        }
                    );
                }
            }

            if (
                session.role !== "admin"
                &&
                restriction.business_id !==
                session.businessId
            ) {

                return Response.json(
                    {
                        error:
                            "Sin permisos"
                    },
                    {
                        status: 403
                    }
                );
            }
        }

        // =========================
        // RESPONSE
        // =========================

        delete restriction.business_id;

        return Response.json({

            ok: true,

            restriction
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    err.message ||
                    "Error interno"
            },
            {
                status: 500
            }
        );
    }
}