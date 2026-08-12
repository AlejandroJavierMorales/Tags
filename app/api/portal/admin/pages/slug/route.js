export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function normalizeSlug(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

export async function POST(req) {
    const conn = await db.getConnection();
    try {
        const body = await req.json().catch(() => null);
        const businessId = Number(body?.businessId || 0);
        const pageId = Number(body?.pageId || 0);
        const slug = normalizeSlug(body?.slug);

        if (!businessId || !pageId || slug.length < 3) {
            return Response.json({ error: "La ruta ingresada no es válida" }, { status: 400 });
        }

        const [pageRows] = await conn.query(
            "SELECT id,page_type,slug,slug_locked FROM tags_qr_pages WHERE id=? AND business_id=? LIMIT 1",
            [pageId, businessId]
        );
        const page = pageRows[0];
        if (!page) return Response.json({ error: "Página no encontrada" }, { status: 404 });

        if (page.slug === slug) return Response.json({ ok: true, slug });
        if (Number(page.slug_locked) === 1 && body?.confirmed !== true) {
            return Response.json(
                { error: "La ruta publicada está protegida y requiere confirmación", requiresConfirmation: true },
                { status: 409 }
            );
        }

        const [conflicts] = await conn.query(
            `SELECT id FROM tags_qr_pages WHERE slug=? AND id<>?
             UNION ALL SELECT id FROM tags_portals WHERE slug=? LIMIT 1`,
            [slug, pageId, slug]
        );
        if (conflicts.length) {
            return Response.json({ error: "Esa ruta ya está siendo utilizada" }, { status: 409 });
        }

        await conn.beginTransaction();
        await conn.query(
            "UPDATE tags_qr_pages SET slug=?,updated_at=NOW() WHERE id=? AND business_id=?",
            [slug, pageId, businessId]
        );
        await conn.query(
            "UPDATE tags_portal_routes SET path=?,updated_at=NOW() WHERE page_id=? AND business_id=?",
            [`/${slug}`, pageId, businessId]
        );
        if (page.page_type === "turnos") {
            await conn.query(
                "UPDATE tags_turnos_apps SET slug=?,updated_at=NOW() WHERE page_id=? AND business_id=?",
                [slug, pageId, businessId]
            );
        }
        if (page.page_type === "directory") {
            await conn.query(
                `UPDATE tags_directory_site_listings dsl
                 INNER JOIN tags_directory_listings dl ON dl.id=dsl.listing_id
                 SET dsl.slug=?
                 WHERE dl.qr_page_id=? AND dl.business_id=?`,
                [slug, pageId, businessId]
            );
        }
        await conn.commit();
        return Response.json({ ok: true, slug });
    } catch (err) {
        await conn.rollback().catch(() => null);
        return Response.json({ error: err.message || "No se pudo cambiar la ruta" }, { status: 500 });
    } finally {
        conn.release();
    }
}
