// =====================================
// API: /api/portal/admin/save
// Descripción: Guarda configuración básica del Portal Público.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function POST(req) {
    const conn = await db.getConnection();

    try {
        const {
            businessId,
            title,
            status = "draft",
            homeRouteId = null,
            description = "",
            logoUrl = "",
            themeCode = "default",
            hideChildHeaders = true,
            hideChildFooters = true,
            businessIdentity = {},
            headerConfig = {},
            footerConfig = {}
        } = await req.json();

        if (!businessId) {
            return Response.json(
                { error: "businessId requerido" },
                { status: 400 }
            );
        }

        if (!["draft", "published", "disabled"].includes(status)) {
            return Response.json(
                { error: "Estado inválido" },
                { status: 400 }
            );
        }

        await conn.beginTransaction();

        const [portalRows] = await conn.query(
            `
            SELECT id
            FROM tags_portals
            WHERE business_id = ?
            LIMIT 1
            `,
            [businessId]
        );

        if (!portalRows.length) {
            return Response.json(
                { error: "Portal no encontrado. Primero activalo desde el Workspace." },
                { status: 404 }
            );
        }

        const portalId = portalRows[0].id;

        await conn.query(
            `
    UPDATE tags_portals
SET
    title = ?,
    description = ?,
    logo_url = ?,
    theme_code = ?,
    header_config = ?,
    footer_config = ?,
    hide_child_headers = ?,
    hide_child_footers = ?,
    status = ?,
    updated_at = NOW()
WHERE id = ?
AND business_id = ?
    `,
            [
                title || "Portal Público",
                description || null,
                logoUrl || null,
                themeCode || "default",

                JSON.stringify(headerConfig || {}),
                JSON.stringify(footerConfig || {}),

                hideChildHeaders ? 1 : 0,
                hideChildFooters ? 1 : 0,
                status,
                portalId,
                businessId
            ]
        );

        await conn.query(
            `
    UPDATE tags_businesses
    SET
        display_name = ?,
        description = ?,
        logo_url = ?,
        cover_url = ?,
        email = ?,
        phone = ?,
        whatsapp = ?,
        address = ?,
        website_url = ?,
        instagram_url = ?,
        facebook_url = ?,
        tiktok_url = ?,
        youtube_url = ?,
        linkedin_url = ?,
        google_reviews_url = ?,
        maps_url = ?,
        updated_at = NOW()
    WHERE id = ?
    `,
            [
                businessIdentity.display_name || null,
                businessIdentity.description || null,
                businessIdentity.logo_url || null,
                businessIdentity.cover_url || null,
                businessIdentity.email || null,
                businessIdentity.phone || null,
                businessIdentity.whatsapp || null,
                businessIdentity.address || null,
                businessIdentity.website_url || null,
                businessIdentity.instagram_url || null,
                businessIdentity.facebook_url || null,
                businessIdentity.tiktok_url || null,
                businessIdentity.youtube_url || null,
                businessIdentity.linkedin_url || null,
                businessIdentity.google_reviews_url || null,
                businessIdentity.maps_url || null,
                businessId
            ]
        );

        await conn.query(
            `
            UPDATE tags_portal_routes
            SET is_home = 0
            WHERE business_id = ?
            `,
            [businessId]
        );

        if (homeRouteId) {
            await conn.query(
                `
                UPDATE tags_portal_routes
                SET is_home = 1
                WHERE id = ?
                AND business_id = ?
                `,
                [
                    homeRouteId,
                    businessId
                ]
            );
        }

        await conn.commit();

        return Response.json({
            ok: true,
            portalId
        });

    } catch (err) {
        await conn.rollback();

        console.error("PORTAL ADMIN SAVE ERROR:", err);

        return Response.json(
            { error: err.message || "Error guardando Portal Público" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}