// =====================================
// API: /api/portal/admin/get
// Descripción: Obtiene o crea el Portal del business y sincroniza sus rutas desde tags_qr_pages.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        if (!businessId) {
            return Response.json(
                { error: "businessId es requerido" },
                { status: 400 }
            );
        }

        const [businessRows] =
            await db.query(
                `
                SELECT
                id,
                name,
                display_name,
                description,
                logo_url,
                cover_url,
                email,
                phone,
                whatsapp,
                address,
                website_url,
                instagram_url,
                facebook_url,
                tiktok_url,
                youtube_url,
                linkedin_url,
                google_reviews_url,
                maps_url
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

        let [portalRows] =
            await db.query(
                `
                SELECT *
                FROM tags_portals
                WHERE business_id = ?
                LIMIT 1
                `,
                [businessId]
            );

        let portal =
            portalRows[0];

        if (!portal) {
            return Response.json({
                ok: true,
                business,
                portal: null,
                routes: []
            });
        }

        const [pages] =
            await db.query(
                `
                SELECT
                    p.id,
                    p.business_id,
                    p.qr_code_id,
                    p.page_type,
                    p.slug,
                    p.slug_locked,
                    p.title,
                    p.status,
                    p.created_at,

                    q.code AS qr_code,
                    q.label AS qr_label,

                    a.code AS addon_code,
                    a.name AS addon_name,
                    a.addon_type,
                    a.page_type AS addon_page_type

                FROM tags_qr_pages p

                LEFT JOIN tags_qr_codes q
                    ON q.id = p.qr_code_id
                    AND q.business_id = p.business_id

                LEFT JOIN tags_addons a
                    ON a.page_type = p.page_type
                    AND a.addon_type = 'page'

                WHERE p.business_id = ?
                AND p.slug IS NOT NULL
                AND p.slug <> ''

                ORDER BY p.created_at ASC, p.id ASC
                `,
                [businessId]
            );

        /* Las rutas se incorporan al Portal de forma explícita desde el dashboard.
           Consultar esta API no debe modificar la composición del sitio. */
        /* for (const page of pages) {
            const path =
                normalizePath(page.slug);

            const label =
                page.title ||
                page.addon_name ||
                page.page_type ||
                "Página";

            const [existingRouteRows] =
                await db.query(
                    `
                    SELECT id
                    FROM tags_portal_routes
                    WHERE portal_id = ?
                    AND page_id = ?
                    LIMIT 1
                    `,
                    [
                        portal.id,
                        page.id
                    ]
                );

            if (existingRouteRows.length === 0) {
                await db.query(
                    `
                    INSERT INTO tags_portal_routes (
                        portal_id,
                        business_id,
                        label,
                        path,
                        route_type,
                        page_id,
                        is_home,
                        is_visible,
                        status,
                        sort_order,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, 'page', ?, 0, 1, ?, 0, NOW(), NOW())
                    `,
                    [
                        portal.id,
                        businessId,
                        label,
                        path,
                        page.id,
                        page.status === "published"
                            ? "published"
                            : "draft"
                    ]
                );
            }
        } */

        const [routes] =
            await db.query(
                `
                SELECT
                    r.*,

                    p.page_type,
                    p.slug AS page_slug,
                    p.title AS page_title,
                    p.status AS page_status,

                    q.code AS qr_code,
                    q.label AS qr_label,

                    a.code AS addon_code,
                    a.name AS addon_name,
                    a.addon_type,
                    a.page_type AS addon_page_type

                FROM tags_portal_routes r

                LEFT JOIN tags_qr_pages p
                    ON p.id = r.page_id

                LEFT JOIN tags_addons a
                    ON a.page_type = p.page_type
                    AND a.addon_type = 'page'

                LEFT JOIN tags_qr_codes q
                    ON q.id = p.qr_code_id
                    AND q.business_id = r.business_id

                WHERE r.portal_id = ?

                ORDER BY
                    r.sort_order ASC,
                    r.id ASC
                `,
                [portal.id]
            );

        return Response.json({
            ok: true,
            business,
            portal,
            routes,
            pages
        });

    } catch (err) {
        console.error("PORTAL ADMIN GET ERROR:", err);

        return Response.json(
            { error: "Error obteniendo Portal" },
            { status: 500 }
        );
    }
}
