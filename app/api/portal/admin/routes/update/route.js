export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function normalizeBoolean(value, fallback = 0) {
    if (value === undefined) return fallback;
    return Number(value) === 1 || value === true ? 1 : 0;
}

function normalizePath(slug) {
    return `/${String(slug || "").replace(/^\/+/, "")}`;
}

export async function POST(req) {
    const conn = await db.getConnection();

    try {
        const body = await req.json().catch(() => null);
        const businessId = Number(body?.businessId || 0);
        let portalId = Number(body?.portalId || 0);
        const routeId = Number(body?.routeId || 0);
        const pageId = Number(body?.pageId || 0);

        if (!businessId || (!routeId && !pageId)) {
            return Response.json(
                { error: "businessId, portalId y una página son requeridos" },
                { status: 400 }
            );
        }

        const [portalRows] = await conn.query(
            "SELECT id FROM tags_portals WHERE business_id=? AND (?=0 OR id=?) LIMIT 1",
            [businessId, portalId, portalId]
        );

        if (!portalRows.length) {
            return Response.json({ error: "Portal no encontrado" }, { status: 404 });
        }

        portalId = Number(portalRows[0].id);

        let currentRouteId = routeId;

        await conn.beginTransaction();

        if (!currentRouteId) {
            const [pageRows] = await conn.query(
                `SELECT id,slug,title,page_type,status
                 FROM tags_qr_pages
                 WHERE id=? AND business_id=? LIMIT 1`,
                [pageId, businessId]
            );
            const page = pageRows[0];

            if (!page) {
                await conn.rollback();
                return Response.json({ error: "Página no encontrada" }, { status: 404 });
            }

            const [existingRows] = await conn.query(
                "SELECT id FROM tags_portal_routes WHERE portal_id=? AND page_id=? LIMIT 1",
                [portalId, pageId]
            );

            if (existingRows.length) {
                currentRouteId = Number(existingRows[0].id);
            } else {
                const [sortRows] = await conn.query(
                    "SELECT COALESCE(MAX(sort_order),0)+1 next_sort FROM tags_portal_routes WHERE portal_id=?",
                    [portalId]
                );
                const label = page.title || page.page_type || "Página";
                const [insertResult] = await conn.query(
                    `INSERT INTO tags_portal_routes
                     (portal_id,business_id,label,nav_label,path,route_type,page_id,is_home,is_visible,show_in_nav,status,sort_order,created_at,updated_at)
                     VALUES (?,?,?,?,?,'page',?,0,?,?,?,?,NOW(),NOW())`,
                    [
                        portalId,
                        businessId,
                        label,
                        String(body?.navLabel || label).trim() || label,
                        normalizePath(page.slug),
                        pageId,
                        normalizeBoolean(body?.isVisible, 1),
                        normalizeBoolean(body?.showInNav, 1),
                        page.status === "published" ? "published" : "draft",
                        Number(sortRows[0]?.next_sort || 1)
                    ]
                );
                currentRouteId = Number(insertResult.insertId);
            }
        }

        const [routeRows] = await conn.query(
            `SELECT r.id,r.is_home,r.is_visible,r.show_in_nav,r.nav_label,p.title,p.page_type,p.status,p.slug
             FROM tags_portal_routes r
             LEFT JOIN tags_qr_pages p ON p.id=r.page_id
             WHERE r.id=? AND r.portal_id=? AND r.business_id=? LIMIT 1`,
            [currentRouteId, portalId, businessId]
        );
        const route = routeRows[0];

        if (!route) {
            await conn.rollback();
            return Response.json({ error: "Ruta no encontrada" }, { status: 404 });
        }

        const nextVisible = normalizeBoolean(body?.isVisible, route.is_visible);
        if (Number(route.is_home) === 1 && nextVisible === 0) {
            await conn.rollback();
            return Response.json(
                { error: "La página principal no puede excluirse del Portal. Definí otra Home primero." },
                { status: 409 }
            );
        }

        const nextNav = nextVisible
            ? normalizeBoolean(body?.showInNav, route.show_in_nav)
            : 0;
        const fallbackLabel = route.title || route.page_type || "Página";
        const navLabel = String(body?.navLabel ?? route.nav_label ?? fallbackLabel).trim() || fallbackLabel;

        await conn.query(
            `UPDATE tags_portal_routes
             SET nav_label=?,label=?,path=?,is_visible=?,show_in_nav=?,status=?,updated_at=NOW()
             WHERE id=? AND portal_id=? AND business_id=?`,
            [
                navLabel,
                fallbackLabel,
                normalizePath(route.slug),
                nextVisible,
                nextNav,
                route.status === "published" ? "published" : "draft",
                currentRouteId,
                portalId,
                businessId
            ]
        );

        await conn.commit();
        return Response.json({ ok: true, routeId: currentRouteId });
    } catch (err) {
        await conn.rollback().catch(() => null);
        return Response.json(
            { error: err.message || "No se pudo actualizar la página del Portal" },
            { status: 500 }
        );
    } finally {
        conn.release();
    }
}
