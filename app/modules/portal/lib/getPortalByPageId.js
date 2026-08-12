// =====================================
// FILE: app/modules/portal/lib/getPortalByPageId.js
// Descripción: Obtiene el Portal asociado a una página pública si esa página forma parte del Portal.
// =====================================

import { db } from "@/app/lib/tags-db";
import { safeParseJSON } from "@/app/modules/qr-page/lib/safeParseJSON";

export default async function getPortalByPageId(pageId) {
    if (!pageId) {
        return null;
    }

    const [rows] = await db.query(
        `
        SELECT
            p.*,

            r.id AS route_id,
            r.label AS route_label,
            r.nav_label,
            r.nav_logo_url,
            r.show_in_nav,
            r.is_home,
            r.is_visible,
            r.path,
            r.page_id,

            qp.slug AS page_slug,
            qp.page_type,
            qp.title AS page_title

        FROM tags_portal_routes r

        INNER JOIN tags_portals p
            ON p.id = r.portal_id

        INNER JOIN tags_qr_pages qp
            ON qp.id = r.page_id

        WHERE r.page_id = ?
        AND r.is_visible = 1
        LIMIT 1
        `,
        [pageId]
    );

    const row = rows[0];

    if (!row) {
        return null;
    }

    const [routeRows] = await db.query(
        `
        SELECT
            r.*,
            qp.slug AS page_slug,
            qp.page_type,
            qp.title AS page_title,
            a.name AS addon_name

        FROM tags_portal_routes r

        LEFT JOIN tags_qr_pages qp
            ON qp.id = r.page_id

        LEFT JOIN tags_addons a
            ON a.page_type = qp.page_type
            AND a.addon_type = 'page'

        WHERE r.portal_id = ?
        AND r.is_visible = 1

        ORDER BY
            r.sort_order ASC,
            r.id ASC
        `,
        [row.id]
    );

    const portal = {
        id: row.id,
        business_id: row.business_id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        logo_url: row.logo_url,
        theme_code: row.theme_code,
        status: row.status,
        home_route_id: row.home_route_id,

        header_config: safeParseJSON(row.header_config),
        footer_config: safeParseJSON(row.footer_config),
        navigation_config: safeParseJSON(row.navigation_config),

        hide_child_headers: row.hide_child_headers,
        hide_child_footers: row.hide_child_footers
    };

    const currentRoute = {
        id: row.route_id,
        label: row.route_label,
        nav_label: row.nav_label,
        nav_logo_url: row.nav_logo_url,
        show_in_nav: row.show_in_nav,
        is_home: row.is_home,
        is_visible: row.is_visible,
        path: row.path,
        page_id: row.page_id,
        page_slug: row.page_slug,
        page_type: row.page_type,
        page_title: row.page_title
    };

    return {
        portal,
        routes: routeRows,
        currentRoute
    };
}
