// =====================================
// FILE: app/modules/portal/lib/getPortalByPageSlug.js
// Descripción: Obtiene el Portal y la ruta asociada a un slug de página.
// =====================================

import { db } from "@/app/lib/tags-db";

export default async function getPortalByPageSlug(
    pageSlug
) {

    const [rows] =
        await db.query(
            `
            SELECT

                p.*,

                r.id              AS route_id,
                r.nav_label,
                r.nav_logo_url,
                r.show_in_nav,
                r.is_home,
                r.path,

                qp.slug           AS page_slug,

                (
                    SELECT
                        JSON_ARRAYAGG(
                            JSON_OBJECT(

                                'id', pr.id,
                                'label', pr.label,
                                'nav_label', pr.nav_label,
                                'nav_logo_url', pr.nav_logo_url,
                                'page_slug', qp2.slug,
                                'show_in_nav', pr.show_in_nav,
                                'is_visible', pr.is_visible,
                                'is_home', pr.is_home

                            )
                        )

                    FROM tags_portal_routes pr

                    LEFT JOIN tags_qr_pages qp2
                        ON qp2.id = pr.page_id

                    WHERE pr.portal_id = p.id

                    ORDER BY
                        pr.sort_order ASC,
                        pr.id ASC

                ) routes

            FROM tags_portals p

            INNER JOIN tags_portal_routes r
                ON r.portal_id = p.id

            INNER JOIN tags_qr_pages qp
                ON qp.id = r.page_id

            WHERE qp.slug = ?

            LIMIT 1
            `,
            [
                pageSlug
            ]
        );

    if (!rows.length) {
        return null;
    }

    const portal =
        rows[0];

    portal.routes =
        portal.routes
            ? JSON.parse(portal.routes)
            : [];

    portal.currentRoute = {

        id:
            portal.route_id,

        nav_label:
            portal.nav_label,

        nav_logo_url:
            portal.nav_logo_url,

        page_slug:
            portal.page_slug,

        is_home:
            portal.is_home,

        path:
            portal.path
    };

    return portal;
}