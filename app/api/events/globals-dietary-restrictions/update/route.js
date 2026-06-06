// ============================================
// /api/events/global-dietary-restrictions/update/route.js
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

            id,

            name,

            color,
            icon,

            severity,

            requires_kitchen_attention

        } = body;

        // =========================
        // VALIDATION
        // =========================

        if (
            !id
            ||
            !name
        ) {

            return Response.json(
                {
                    error:
                        "Datos incompletos"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // RESTRICTION
        // =========================

        const [rows] =
            await db.query(
                `

                SELECT
                    *

                FROM
                    tags_event_dietary_restrictions

                WHERE

                    id = ?

                    AND

                    is_system = 1

                LIMIT 1

                `,
                [id]
            );

        if (!rows.length) {

            return Response.json(
                {
                    error:
                        "Restricción global no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const restriction =
            rows[0];

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

                    AND

                    id != ?

                LIMIT 1

                `,
                [
                    slug,
                    id
                ]
            );

        if (duplicates.length) {

            return Response.json(
                {
                    error:
                        "Ya existe una restricción con ese nombre"
                },
                {
                    status: 400
                }
            );
        }

        // =========================
        // UPDATE
        // =========================

        await db.query(
            `

            UPDATE
                tags_event_dietary_restrictions

            SET

                name = ?,
                slug = ?,

                color = ?,
                icon = ?,

                severity = ?,

                requires_kitchen_attention = ?,

                updated_at = NOW()

            WHERE

                id = ?

                AND

                is_system = 1

            `,
            [

                name,
                slug,

                color || null,
                icon || null,

                severity || "preference",

                requires_kitchen_attention
                    ? 1
                    : 0,

                id
            ]
        );

        // =========================
        // RESPONSE
        // =========================

        return Response.json({
            ok: true
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