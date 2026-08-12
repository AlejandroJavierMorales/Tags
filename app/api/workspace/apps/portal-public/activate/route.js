// =====================================
// API: /api/workspace/apps/portal-public/activate
// Descripción: Activa el Portal Público del negocio desde el Workspace.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    const conn =
        await db.getConnection();

    try {
        const {
            businessId
        } = await req.json();

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
                { status: 400 }
            );
        }

        const [businessRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_businesses
                WHERE id = ?
                LIMIT 1
                `,
                [businessId]
            );

        const business =
            businessRows[0];

        if (!business) {
            return Response.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        const [addonRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_business_addons
                WHERE business_id = ?
                AND addon_code = 'portal_public'
                AND status = 'active'
                AND (
                    expires_at IS NULL
                    OR expires_at >= NOW()
                )
                LIMIT 1
                `,
                [businessId]
            );

        if (!addonRows.length) {
            return Response.json(
                { error: "El cliente no tiene Portal Público activo" },
                { status: 403 }
            );
        }

        const [existingRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_portals
                WHERE business_id = ?
                LIMIT 1
                `,
                [businessId]
            );

        if (existingRows.length) {
            return Response.json({
                ok: true,
                portal: existingRows[0],
                alreadyExists: true
            });
        }

        await conn.beginTransaction();

        const slug =
            `portal-${businessId}`;

        const [result] =
            await conn.query(
                `
                INSERT INTO tags_portals (
                    business_id,
                    slug,
                    title,
                    status,
                    theme_code,
                    header_config,
                    footer_config,
                    navigation_config,
                    hide_child_headers,
                    hide_child_footers,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, 'draft', 'tags_default', ?, ?, ?, 1, 1, NOW(), NOW())
                `,
                [
                    businessId,
                    slug,
                    business.name || "Portal Público",
                    JSON.stringify({}),
                    JSON.stringify({}),
                    JSON.stringify({})
                ]
            );

        const portalId =
            result.insertId;

        await conn.commit();

        return Response.json({
            ok: true,
            portalId,
            slug,
            status: "draft"
        });

    } catch (err) {
        await conn.rollback();

        console.error(
            "WORKSPACE PORTAL PUBLIC ACTIVATE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error activando Portal Público"
            },
            {
                status: 500
            }
        );

    } finally {
        conn.release();
    }
}
