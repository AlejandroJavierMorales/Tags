import { db } from "@/app/lib/tags-db";
import { safeParseJSON } from "@/app/modules/qr-page/lib/safeParseJSON";
import { getDirectoryEmbeddedStore } from "./getDirectoryEmbeddedStore";
import { getDirectoryEmbeddedResto } from "./getDirectoryEmbeddedResto";
import { getDirectoryEmbeddedReviews } from "./getDirectoryEmbeddedReviews";
import { getDirectoryModuleSettings } from "./directoryModuleSettings";

export async function getDirectoryWebPageData(pageId, { includeDraft = false } = {}) {
    if (!pageId) return null;
    const [pages] = await db.query(`SELECT p.*,b.name business_name,b.email business_email,b.phone business_phone,t.code theme_code,t.name theme_name,t.css_tokens theme_css_tokens FROM tags_qr_pages p INNER JOIN tags_businesses b ON b.id=p.business_id LEFT JOIN tags_qr_page_themes t ON t.id=p.theme_id WHERE p.id=? AND p.page_type='directory' ${includeDraft ? "" : "AND p.status='published'"} LIMIT 1`, [pageId]);
    const page = pages[0];
    if (!page) return null;
    const pageGlobalStyles = safeParseJSON(page.global_styles);
    const directoryModules = getDirectoryModuleSettings(pageGlobalStyles);
    const reviewLimit = Math.max(
        10,
        Number(directoryModules.reviewsSlider?.content?.limit || 10)
    );
    const [sections, blocks, products, embeddedStore, embeddedResto, embeddedReviews] = await Promise.all([
        db.query("SELECT * FROM tags_qr_page_sections WHERE page_id=? AND is_visible=1 ORDER BY sort_order,id", [page.id]),
        db.query("SELECT b.* FROM tags_qr_page_blocks b INNER JOIN tags_qr_page_sections s ON s.id=b.section_id WHERE s.page_id=? AND s.is_visible=1 AND b.is_visible=1 ORDER BY b.sort_order,b.id", [page.id]),
        db.query("SELECT * FROM tags_qr_page_products WHERE page_id=? AND is_visible=1 ORDER BY sort_order,id", [page.id]),
        getDirectoryEmbeddedStore(page.business_id),
        getDirectoryEmbeddedResto(page.business_id),
        getDirectoryEmbeddedReviews(page.business_id, reviewLimit)
    ]);
    return {
        page: { ...page, theme: page.theme_id ? { id: page.theme_id, code: page.theme_code, name: page.theme_name, css_tokens: safeParseJSON(page.theme_css_tokens) } : null, global_styles: { ...pageGlobalStyles, directoryModules }, typography_tokens: safeParseJSON(page.typography_tokens), header_config: safeParseJSON(page.header_config), footer_config: safeParseJSON(page.footer_config), theme_config: safeParseJSON(page.theme_config) },
        sections: sections[0].map(section => ({ ...section, settings_json: safeParseJSON(section.settings_json), styles_json: safeParseJSON(section.styles_json), blocks: blocks[0].filter(block => Number(block.section_id) === Number(section.id)).map(block => ({ ...block, content_json: safeParseJSON(block.content_json), styles_json: safeParseJSON(block.styles_json) })) })),
        products: products[0].map(product => ({
            ...product,
            images_json: safeParseJSON(product.images_json)
        })),
        embeddedStore,
        embeddedResto,
        embeddedReviews
    };
}
