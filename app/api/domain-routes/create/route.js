export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { normalizePath } from "@/app/modules/domains/lib/domainUtils";

export async function POST(req) {
    try {
        const body = await req.json();
        const domainId = Number(body?.domain_id);
        const path = normalizePath(body?.path);
        const addonCode = String(body?.addon_code || "").trim().toLowerCase();
        const targetSlug = String(body?.target_slug || "").trim();
        if (!domainId || !addonCode || !targetSlug) return Response.json({ error: "Dominio, addon y slug son obligatorios" }, { status: 400 });

        const [[domain], [addon], [duplicate]] = await Promise.all([
            db.query("SELECT id FROM tags_domains WHERE id = ? LIMIT 1", [domainId]),
            db.query("SELECT code FROM tags_addons WHERE code = ? AND is_active = 1 AND addon_type = 'page' LIMIT 1", [addonCode]),
            db.query("SELECT id FROM tags_domain_routes WHERE domain_id = ? AND path = ? LIMIT 1", [domainId, path])
        ]);
        if (!domain.length) return Response.json({ error: "El dominio no existe" }, { status: 400 });
        if (!addon.length) return Response.json({ error: "El addon debe ser una aplicación pública activa" }, { status: 400 });
        if (duplicate.length) return Response.json({ error: "Ya existe una ruta con ese path en este dominio" }, { status: 409 });

        await db.query("INSERT INTO tags_domain_routes (domain_id, path, addon_code, target_slug, is_active) VALUES (?, ?, ?, ?, ?)", [domainId, path, addonCode, targetSlug, body.is_active === false ? 0 : 1]);
        return Response.json({ ok: true });
    } catch (error) {
        console.error("DOMAIN ROUTES CREATE ERROR:", error);
        return Response.json({ error: "Error creando ruta" }, { status: 500 });
    }
}
