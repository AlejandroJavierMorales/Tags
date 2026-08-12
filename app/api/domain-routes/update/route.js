export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { normalizePath } from "@/app/modules/domains/lib/domainUtils";

export async function POST(req) {
    try {
        const body = await req.json();
        const id = Number(body?.id);
        const domainId = Number(body?.domain_id);
        const path = normalizePath(body?.path);
        const addonCode = String(body?.addon_code || "").trim().toLowerCase();
        const targetSlug = String(body?.target_slug || "").trim();
        if (!id || !domainId || !addonCode || !targetSlug) return Response.json({ error: "ID, dominio, addon y slug son obligatorios" }, { status: 400 });

        const [[addon], [duplicate]] = await Promise.all([
            db.query("SELECT code FROM tags_addons WHERE code = ? AND is_active = 1 AND addon_type = 'page' LIMIT 1", [addonCode]),
            db.query("SELECT id FROM tags_domain_routes WHERE domain_id = ? AND path = ? AND id <> ? LIMIT 1", [domainId, path, id])
        ]);
        if (!addon.length) return Response.json({ error: "El addon debe ser una aplicación pública activa" }, { status: 400 });
        if (duplicate.length) return Response.json({ error: "Ya existe otra ruta con ese path en este dominio" }, { status: 409 });

        await db.query("UPDATE tags_domain_routes SET path = ?, addon_code = ?, target_slug = ?, is_active = ? WHERE id = ? AND domain_id = ?", [path, addonCode, targetSlug, body.is_active === false ? 0 : 1, id, domainId]);
        return Response.json({ ok: true });
    } catch (error) {
        console.error("DOMAIN ROUTES UPDATE ERROR:", error);
        return Response.json({ error: "Error actualizando ruta" }, { status: 500 });
    }
}
