import { db } from "@/app/lib/tags-db";

function parseJson(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return {}; }
}

export async function getDirectoryEmbeddedStore(businessId) {
    if (!businessId) return null;
    const [stores] = await db.query(`
        SELECT s.*,p.global_styles page_global_styles,t.code theme_code,t.name theme_name,t.css_tokens theme_css_tokens,
            b.logo_url business_logo_url,b.cover_url business_cover_url,b.email business_email,b.phone business_phone,b.whatsapp business_whatsapp,b.address business_address,b.website_url business_website_url,b.instagram_url business_instagram_url,b.facebook_url business_facebook_url,
            EXISTS(SELECT 1 FROM tags_business_addons reviews WHERE reviews.business_id=s.business_id AND reviews.addon_code='client_reviews' AND reviews.status='active' AND (reviews.expires_at IS NULL OR reviews.expires_at>=NOW())) has_reviews
        FROM tags_stores s
        INNER JOIN tags_qr_pages p ON p.id=s.page_id AND p.page_type='store'
        INNER JOIN tags_businesses b ON b.id=s.business_id
        INNER JOIN tags_business_addons ba ON ba.business_id=s.business_id AND ba.addon_code='store' AND ba.status='active' AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())
        LEFT JOIN tags_qr_page_themes t ON t.id=p.theme_id
        WHERE s.business_id=? AND (s.app_type='store' OR s.app_type IS NULL)
        ORDER BY s.id DESC LIMIT 1`, [businessId]);
    const store = stores[0];
    if (!store) return null;
    store.settings_json = parseJson(store.settings_json);
    store.styles_json = parseJson(store.styles_json);
    store.page_global_styles = parseJson(store.page_global_styles);
    store.logo_url = store.business_logo_url || store.logo_url;
    store.cover_url = store.business_cover_url || store.cover_url;
    store.email = store.business_email || store.email;
    store.phone = store.business_phone || store.phone;
    store.whatsapp = store.business_whatsapp || store.whatsapp;
    store.address = store.business_address || store.address;
    store.website_url = store.business_website_url || store.website_url;
    store.instagram_url = store.business_instagram_url || store.instagram_url;
    store.facebook_url = store.business_facebook_url || store.facebook_url;
    store.theme_css_vars = { ...parseJson(store.theme_css_tokens), ...parseJson(store.styles_json?.css_tokens) };
    store.has_reviews = Number(store.has_reviews) === 1;
    const [sectionsResult, blocksResult] = await Promise.all([
        db.query("SELECT * FROM tags_store_sections WHERE store_id=? AND is_visible=1 ORDER BY sort_order,id", [store.id]),
        db.query("SELECT b.* FROM tags_store_blocks b INNER JOIN tags_store_sections s ON s.id=b.section_id WHERE s.store_id=? AND s.is_visible=1 AND b.is_visible=1 ORDER BY s.sort_order,b.sort_order,b.id", [store.id])
    ]);
    return {
        store,
        sections: sectionsResult[0].map(section => ({ ...section, settings_json: parseJson(section.settings_json) })),
        blocks: blocksResult[0].map(block => ({ ...block, content_json: parseJson(block.content_json), styles_json: parseJson(block.styles_json), animation_json: parseJson(block.animation_json) }))
    };
}
