// ============================================
// /api/events/global-dietary-restrictions/create/route.js
// ============================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import { getEventSession }
    from "@/app/modules/e-events/lib/geEventSession";

function createSlug(text = "") {

    return text
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

export async function POST(req) {

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
        // ONLY ADMINS
        // =========================

        const canManageGlobalRestrictions =

            session.role === "admin"
            ||
            session.role === "event_client";

        if (!canManageGlobalRestrictions) {

            return Response.json(
                {
                    error:
                        "Sin permisos para administrar restricciones globales"
                },
                {
                    status: 403
                }
            );
        }

        // =========================
        // BODY
        // =========================

        const body =
            await req.json();

        const {

            name,

            color,
            icon,

            severity,

            requires_kitchen_attention

        } = body;

        // =========================
        // VALIDATION
        // =========================

        if (!name) {

            return Response.json(
                {
                    error:
                        "Nombre requerido"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // SLUG
        // =========================

        const slug =
            createSlug(name);

        // =========================
        // DUPLICATES
        // =========================

        const [duplicates] =
            await db.query(
                `

                SELECT
                    id

                FROM
                    tags_event_dietary_restrictions

                WHERE

                    is_system = 1

                    AND

                    slug = ?

                LIMIT 1

                `,
                [slug]
            );

        if (duplicates.length) {

            return Response.json(
                {
                    error:
                        "La restricción ya existe"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // INSERT
        // =========================

        const [result] =
            await db.query(
                `

                INSERT INTO
                tags_event_dietary_restrictions
                (

                    event_id,

                    name,
                    slug,

                    color,
                    icon,

                    is_system,

                    severity,

                    requires_kitchen_attention,

                    created_at

                )

                VALUES
                (

                    NULL,

                    ?,
                    ?,

                    ?,
                    ?,

                    1,

                    ?,

                    ?,

                    NOW()

                )

                `,
                [

                    name,
                    slug,

                    color || null,
                    icon || null,

                    severity || "preference",

                    requires_kitchen_attention
                        ? 1
                        : 0
                ]
            );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({

            ok: true,

            id:
                result.insertId
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