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
    try {
        const body = await req.json().catch(() => null);
        const businessId = Number(body?.businessId || 0);
        const slug = normalizeSlug(body?.slug);

        if (!businessId || slug.length < 3) {
            return Response.json(
                { error: "Ingresá una ruta de al menos 3 caracteres" },
                { status: 400 }
            );
        }

        const [conflicts] = await db.query(
            `SELECT 'portal' source FROM tags_portals WHERE slug=? AND business_id<>?
             UNION ALL
             SELECT 'page' source FROM tags_qr_pages WHERE slug=?
             UNION ALL
             SELECT 'directory' source FROM tags_directory_site_listings WHERE slug=?
             LIMIT 1`,
            [slug, businessId, slug, slug]
        );

        if (conflicts.length) {
            return Response.json({ error: "Esa URL ya está siendo utilizada" }, { status: 409 });
        }

        const [result] = await db.query(
            "UPDATE tags_portals SET slug=?,updated_at=NOW() WHERE business_id=?",
            [slug, businessId]
        );

        if (!result.affectedRows) {
            return Response.json({ error: "Portal no encontrado" }, { status: 404 });
        }

        return Response.json({ ok: true, slug, path: `/p/${slug}` });
    } catch (err) {
        return Response.json(
            { error: err.message || "No se pudo cambiar la URL principal" },
            { status: 500 }
        );
    }
}
