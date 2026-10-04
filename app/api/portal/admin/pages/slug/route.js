export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";

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
    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId || 0);
    const pageId = Number(body?.pageId || 0);
    const slug = normalizeSlug(body?.slug);

    if (!businessId || !pageId || slug.length < 3) {
        return Response.json({ error: "La ruta ingresada no es válida" }, { status: 400 });
    }

    const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

    const conn = await db.getConnection();
    let transactionStarted = false;
    try {
        await conn.beginTransaction();
        transactionStarted = true;

        const [pageRows] = await conn.query(
            "SELECT id,page_type,slug,slug_locked FROM tags_qr_pages WHERE id=? AND business_id=? LIMIT 1 FOR UPDATE",
            [pageId, businessId]
        );
        const page = pageRows[0];
        if (!page) {
            await conn.rollback();
            transactionStarted = false;
            return Response.json({ error: "Página no encontrada" }, { status: 404 });
        }

        if (page.slug === slug) {
            await conn.rollback();
            transactionStarted = false;
            return Response.json({ ok: true, slug });
        }
        if (Number(page.slug_locked) === 1 && body?.confirmed !== true) {
            await conn.rollback();
            transactionStarted = false;
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
            await conn.rollback();
            transactionStarted = false;
            return Response.json({ error: "Esa ruta ya está siendo utilizada" }, { status: 409 });
        }

        let directoryListings = [];
        if (page.page_type === "directory") {
            const [rows] = await conn.query(
                `SELECT dsl.site_id,dsl.listing_id,dsl.slug
                   FROM tags_directory_site_listings dsl
                   INNER JOIN tags_directory_listings dl ON dl.id=dsl.listing_id
                  WHERE dl.qr_page_id=? AND dl.business_id=?
                  FOR UPDATE`,
                [pageId, businessId]
            );
            directoryListings = rows;

            if (!directoryListings.length) {
                await conn.rollback();
                transactionStarted = false;
                return Response.json(
                    { error: "La Web no tiene una ficha de Directorio vinculada y no se modificó su URL" },
                    { status: 409 }
                );
            }

            for (const listing of directoryListings) {
                const [activeConflict] = await conn.query(
                    `SELECT id FROM tags_directory_site_listings
                      WHERE site_id=? AND slug=? AND listing_id<>? LIMIT 1`,
                    [listing.site_id, slug, listing.listing_id]
                );
                const [historicalConflict] = await conn.query(
                    `SELECT id FROM tags_directory_slug_redirects
                      WHERE site_id=? AND old_slug=? AND listing_id<>? LIMIT 1`,
                    [listing.site_id, slug, listing.listing_id]
                );
                if (activeConflict.length || historicalConflict.length) {
                    await conn.rollback();
                    transactionStarted = false;
                    return Response.json(
                        { error: "Esa URL ya está siendo utilizada o pertenece al historial de otra Web" },
                        { status: 409 }
                    );
                }
            }
        }

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
            for (const listing of directoryListings) {
                // Si se vuelve a una URL anterior de esta ficha, deja de ser
                // un alias antes de convertirse nuevamente en la URL vigente.
                await conn.query(
                    "DELETE FROM tags_directory_slug_redirects WHERE site_id=? AND listing_id=? AND old_slug=?",
                    [listing.site_id, listing.listing_id, slug]
                );
                if (listing.slug && listing.slug !== slug) {
                    await conn.query(
                        `INSERT INTO tags_directory_slug_redirects (site_id,listing_id,old_slug)
                         VALUES (?,?,?)
                         ON DUPLICATE KEY UPDATE listing_id=VALUES(listing_id),updated_at=NOW()`,
                        [listing.site_id, listing.listing_id, listing.slug]
                    );
                }
            }
            await conn.query(
                `UPDATE tags_directory_site_listings dsl
                 INNER JOIN tags_directory_listings dl ON dl.id=dsl.listing_id
                 SET dsl.slug=?,dsl.updated_at=NOW()
                 WHERE dl.qr_page_id=? AND dl.business_id=?`,
                [slug, pageId, businessId]
            );
        }

        await conn.commit();
        transactionStarted = false;
        return Response.json({
            ok: true,
            slug,
            permanentRedirectsCreated: directoryListings.filter(item => item.slug && item.slug !== slug).length,
        });
    } catch (err) {
        if (transactionStarted) await conn.rollback().catch(() => null);
        const migrationMissing = err?.code === "ER_NO_SUCH_TABLE"
            && String(err?.sqlMessage || err?.message || "").includes("tags_directory_slug_redirects");
        return Response.json(
            { error: migrationMissing ? "Falta ejecutar la migración de historial de URLs antes de cambiar esta ruta" : (err.message || "No se pudo cambiar la ruta") },
            { status: 500 }
        );
    } finally {
        conn.release();
    }
}
