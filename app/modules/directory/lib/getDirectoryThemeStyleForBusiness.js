import { db } from "@/app/lib/tags-db";
import { safeParseJSON } from "@/app/modules/qr-page/lib/safeParseJSON";
import { buildDirectoryThemeStyle } from "./directoryThemeStyle";

export async function getDirectoryThemeStyleForBusiness(businessId) {
    if (!businessId) return {};

    const [rows] = await db.query(
        "SELECT p.global_styles,t.css_tokens " +
        "FROM tags_directory_listings dl " +
        "INNER JOIN tags_directory_site_listings dsl ON dsl.listing_id=dl.id AND dsl.publication_status='published' " +
        "INNER JOIN tags_qr_pages p ON p.id=dl.qr_page_id AND p.page_type='directory' AND p.status='published' " +
        "LEFT JOIN tags_qr_page_themes t ON t.id=p.theme_id " +
        "WHERE dl.business_id=? AND dl.status='published' " +
        "ORDER BY dsl.is_free ASC,dl.id DESC LIMIT 1",
        [businessId]
    );

    const row = rows[0];
    if (!row) return {};

    return buildDirectoryThemeStyle({
        themeTokens: safeParseJSON(row.css_tokens),
        globalStyles: safeParseJSON(row.global_styles)
    });
}
