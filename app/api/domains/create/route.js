export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { isValidDomain, normalizeDomain, parseThemeTokens } from "@/app/modules/domains/lib/domainUtils";

export async function POST(req) {
    try {
        const body = await req.json();
        const domain = normalizeDomain(body?.domain);
        const businessId = Number(body?.business_id);
        const themeId = Number(body?.theme_id);

        if (!isValidDomain(domain) || !businessId || !themeId) {
            return Response.json({ error: "Cliente, dominio y tema son obligatorios" }, { status: 400 });
        }

        const [[business], [theme], [existing]] = await Promise.all([
            db.query("SELECT id FROM tags_businesses WHERE id = ? LIMIT 1", [businessId]),
            db.query("SELECT id, css_tokens FROM tags_qr_page_themes WHERE id = ? AND is_active = 1 LIMIT 1", [themeId]),
            db.query("SELECT id FROM tags_domains WHERE domain = ? LIMIT 1", [domain])
        ]);

        if (!business.length) return Response.json({ error: "El cliente no existe" }, { status: 400 });
        if (!theme.length) return Response.json({ error: "El tema seleccionado no existe o está inactivo" }, { status: 400 });
        if (existing.length) return Response.json({ error: "Ya existe un dominio con ese nombre" }, { status: 409 });

        const tokens = parseThemeTokens(theme[0].css_tokens);
        const color = tokens["--qr-primary"] || tokens["--primary"] || null;

        await db.query(`
            INSERT INTO tags_domains (business_id, domain, theme_id, theme_color, favicon_url, logo_url, site_name, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [businessId, domain, themeId, color, body.favicon_url || null, body.logo_url || null, body.site_name?.trim() || null, body.is_active === false ? 0 : 1]);

        return Response.json({ ok: true });
    } catch (error) {
        console.error("DOMAINS CREATE ERROR:", error);
        return Response.json({ error: "Error creando dominio" }, { status: 500 });
    }
}
