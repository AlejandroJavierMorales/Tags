// =====================================
// FILE: app/modules/portal/lib/syncPortalRoute.js
// Descripción: Sincroniza una página existente como ruta del Portal, si el Portal existe.
// =====================================

export async function syncPortalRoute({
    conn,
    businessId,
    pageId,
    label = null,
    includeInPortal = false
}) {
    if (!conn || !businessId || !pageId || !includeInPortal) {
        return null;
    }

    const [portalRows] =
        await conn.query(
            `
            SELECT id
            FROM tags_portals
            WHERE business_id = ?
            LIMIT 1
            `,
            [businessId]
        );

    const portal =
        portalRows[0];

    if (!portal) {
        return null;
    }

    const [pageRows] =
        await conn.query(
            `
            SELECT
                id,
                slug,
                title,
                page_type,
                status
            FROM tags_qr_pages
            WHERE id = ?
            AND business_id = ?
            LIMIT 1
            `,
            [
                pageId,
                businessId
            ]
        );

    const page =
        pageRows[0];

    if (!page || !page.slug) {
        return null;
    }

    const routeLabel =
        label ||
        page.title ||
        page.page_type ||
        "Página";

    const routePath =
        `/${page.slug}`;

    const [existingRows] =
        await conn.query(
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

    if (existingRows.length) {
        const routeId =
            existingRows[0].id;

        await conn.query(
            `
            UPDATE tags_portal_routes
            SET
                label = ?,
                path = ?,
                status = ?,
                is_visible = 1,
                show_in_nav = 1,
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                routeLabel,
                routePath,
                page.status === "published" ? "published" : "draft",
                routeId
            ]
        );

        return routeId;
    }

    const [sortRows] =
        await conn.query(
            `
            SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort
            FROM tags_portal_routes
            WHERE portal_id = ?
            `,
            [portal.id]
        );

    const sortOrder =
        Number(sortRows[0]?.next_sort || 1);

    const [insertResult] =
        await conn.query(
            `
            INSERT INTO tags_portal_routes (
                portal_id,
                business_id,
                label,
                nav_label,
                path,
                route_type,
                page_id,
                is_home,
                is_visible,
                show_in_nav,
                status,
                sort_order,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, 'page', ?, 0, 1, 1, ?, ?, NOW(), NOW())
            `,
            [
                portal.id,
                businessId,
                routeLabel,
                routeLabel,
                routePath,
                page.id,
                page.status === "published" ? "published" : "draft",
                sortOrder
            ]
        );

    return insertResult.insertId;
}