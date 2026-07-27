export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getRestoModulesList, getRestoModuleDefinition } from "@/app/modules/resto/lib/restoModuleRegistry";
import { requireRestoBuilderAccess, restoAccessResponse } from "@/app/modules/resto/lib/restoBuilderAccess";

const parse = value => {
    if (!value) return {};
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return {}; }
};

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const businessId = searchParams.get("businessId");
        if (!businessId) return Response.json({ error: "businessId requerido" }, { status: 400 });

        const access = await requireRestoBuilderAccess({ businessId });
        if (!access.allowed) return restoAccessResponse(access);

        const [stores] = await db.query(`
            SELECT s.*, p.theme_id, p.global_styles AS page_global_styles,
                   t.code AS theme_code, t.name AS theme_name,
                   t.css_tokens AS theme_css_tokens
            FROM tags_stores s
            INNER JOIN tags_qr_pages p ON p.id = s.page_id
            LEFT JOIN tags_qr_page_themes t ON t.id = p.theme_id
            WHERE s.business_id = ? AND s.app_type = 'resto'
            LIMIT 1`, [businessId]);
        const store = stores?.[0];
        if (!store) return Response.json({ error: "Resto no encontrado" }, { status: 404 });

        const [sections] = await db.query(`
            SELECT * FROM tags_store_sections
            WHERE store_id = ?
            ORDER BY sort_order ASC, id ASC`, [store.id]);
        const [blocks] = await db.query(`
            SELECT b.* FROM tags_store_blocks b
            INNER JOIN tags_store_sections s ON s.id = b.section_id
            WHERE s.store_id = ?
            ORDER BY s.sort_order ASC, b.sort_order ASC, b.id ASC`, [store.id]);
        const [addonRows] = await db.query(`
            SELECT 1 AS active FROM tags_business_addons
            WHERE business_id = ? AND addon_code = 'client_reviews'
            AND status IN ('active','enabled') LIMIT 1`, [businessId]);

        const hasReviews = Boolean(addonRows?.length);
        const modules = getRestoModulesList()
            .filter(module => hasReviews || module.category !== "reviews")
            .map(module => {
                const definition = getRestoModuleDefinition(module.type);
                const { component, ...safeDefinition } = definition || module;
                return safeDefinition;
            });

        return Response.json({
            success: true,
            store: {
                ...store,
                settings_json: parse(store.settings_json),
                styles_json: parse(store.styles_json),
                page_global_styles: parse(store.page_global_styles),
                theme: store.theme_id ? {
                    id: store.theme_id,
                    code: store.theme_code,
                    name: store.theme_name,
                    css_tokens: parse(store.theme_css_tokens)
                } : null
            },
            sections: sections.map(section => ({ ...section, settings_json: parse(section.settings_json) })),
            blocks: blocks.map(block => ({
                ...block,
                content_json: parse(block.content_json),
                styles_json: parse(block.styles_json),
                animation_json: parse(block.animation_json)
            })),
            hasReviews,
            modules
        });
    } catch (error) {
        console.error("RESTO BUILDER GET ERROR:", error);
        return Response.json({ error: "Error obteniendo Builder de Resto" }, { status: 500 });
    }
}
