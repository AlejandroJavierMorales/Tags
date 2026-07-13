// =====================================
// FILE: app/modules/portal/lib/getPublicPortalContext.js
// Descripción: Obtiene el contexto público del Portal para envolver páginas internas.
// =====================================

import { db }
    from "@/app/lib/tags-db";

import { safeParseJSON }
    from "@/app/modules/qr-page/lib/safeParseJSON";

export async function getPublicPortalContext({
    businessId,
    pageId,
    slug
}) {
    if (!businessId) {
        return {
            hasPortal: false,
            portal: null,
            routes: [],
            currentRoute: null
        };
    }

    const [portalRows] =
        await db.query(
            `
            SELECT
                p.*,

                b.name AS business_name,
                b.display_name AS business_display_name,
                b.description AS business_description,
                b.logo_url AS business_logo_url,
                b.cover_url AS business_cover_url,
                b.email AS business_email,
                b.phone AS business_phone,
                b.whatsapp AS business_whatsapp,
                b.address AS business_address,
                b.website_url AS business_website_url,
                b.instagram_url AS business_instagram_url,
                b.facebook_url AS business_facebook_url,
                b.tiktok_url AS business_tiktok_url,
                b.youtube_url AS business_youtube_url,
                b.linkedin_url AS business_linkedin_url,
                b.google_reviews_url AS business_google_reviews_url,
                b.maps_url AS business_maps_url,
                t.code AS theme_code,
                t.name AS theme_name,
                t.css_tokens AS theme_css_tokens
            FROM tags_portals p

            INNER JOIN tags_businesses b
                ON b.id = p.business_id

            LEFT JOIN tags_qr_page_themes t
                ON t.code = p.theme_code

            WHERE p.business_id = ?
            AND p.status = 'published'

            LIMIT 1
            `,
            [
                businessId
            ]
        );

    const portal =
        portalRows[0];

    if (!portal) {
        return {
            hasPortal: false,
            portal: null,
            routes: [],
            currentRoute: null
        };
    }

    portal.header_config =
        safeParseJSON(
            portal.header_config
        );

    portal.footer_config =
        safeParseJSON(
            portal.footer_config
        );

    portal.navigation_config =
        safeParseJSON(
            portal.navigation_config
        );

    portal.theme =
        portal.theme_code
            ? {
                code: portal.theme_code,
                name: portal.theme_name,
                css_tokens: safeParseJSON(
                    portal.theme_css_tokens
                )
            }
            : null;

    portal.identity = {
        name:
            portal.business_display_name ||
            portal.business_name ||
            portal.title,

        description:
            portal.business_description ||
            portal.description,

        logo_url:
            portal.business_logo_url ||
            portal.logo_url,

        cover_url:
            portal.business_cover_url,

        email:
            portal.business_email,

        phone:
            portal.business_phone,

        whatsapp:
            portal.business_whatsapp,

        address:
            portal.business_address,

        website_url:
            portal.business_website_url,

        instagram_url:
            portal.business_instagram_url,

        facebook_url:
            portal.business_facebook_url,

        tiktok_url:
            portal.business_tiktok_url,

        youtube_url:
            portal.business_youtube_url,

        linkedin_url:
            portal.business_linkedin_url,

        google_reviews_url:
            portal.business_google_reviews_url,

        maps_url:
            portal.business_maps_url
    };

    const [routes] =
        await db.query(
            `
            SELECT
                r.*,

                qp.slug AS page_slug,
                qp.page_type,
                qp.title AS page_title,
                qp.status AS page_status,

                a.code AS addon_code,
                a.name AS addon_name

            FROM tags_portal_routes r

            LEFT JOIN tags_qr_pages qp
                ON qp.id = r.page_id

            LEFT JOIN tags_addons a
                ON a.page_type = qp.page_type
                AND a.addon_type = 'page'

            WHERE r.portal_id = ?
            AND r.is_visible = 1
            AND r.status = 'published'

            ORDER BY
                r.is_home DESC,
                r.sort_order ASC,
                r.id ASC
            `,
            [
                portal.id
            ]
        );

    const currentRoute =
        routes.find(route =>
            pageId &&
            Number(route.page_id) === Number(pageId)
        )
        ||
        routes.find(route =>
            slug &&
            String(route.page_slug || "") === String(slug)
        )
        ||
        null;

    return {
        hasPortal: true,
        portal,
        routes,
        currentRoute
    };
}