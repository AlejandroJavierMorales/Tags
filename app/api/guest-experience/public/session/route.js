export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getGuestPublicSession } from "@/app/modules/guest-experience/lib/getGuestPublicSession";
import { parseGuestJson, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { db } from "@/app/lib/tags-db";

export async function GET(req) {
    try {
    const slug = new URL(req.url).searchParams.get("slug");
    const session = await getGuestPublicSession(slug);
    if (!session) return guestError("La sesión venció o no es válida", 401);
    const settings = parseGuestJson(session.settings_json);
    let theme;
    if (!settings.themeOverride) {
        const [portalThemes] = await db.query("SELECT t.id,t.code,t.name,t.css_tokens FROM tags_portals p INNER JOIN tags_qr_page_themes t ON t.code=p.theme_code AND t.is_active=1 WHERE p.business_id=? LIMIT 1", [session.business_id]);
        theme = portalThemes[0];
    }
    if (!theme && settings.themeId) {
        const [selected] = await db.query("SELECT id,code,name,css_tokens FROM tags_qr_page_themes WHERE id=? AND is_active=1 LIMIT 1", [settings.themeId]);
        theme = selected[0];
    }
    if (!theme) {
        const [defaults] = await db.query("SELECT id,code,name,css_tokens FROM tags_qr_page_themes WHERE code='tags_default' AND is_active=1 LIMIT 1");
        theme = defaults[0];
    }
    let commerceRows = [];
    try {
        [commerceRows] = await db.query("SELECT i.module_type FROM tags_guest_commerce_integrations i INNER JOIN tags_stores s ON s.id=i.store_id AND s.business_id=? AND ((i.module_type='resto' AND s.app_type='resto') OR (i.module_type='store' AND (s.app_type='store' OR s.app_type IS NULL))) INNER JOIN tags_qr_pages p ON p.id=s.page_id AND p.status='published' WHERE i.guest_app_id=? AND i.is_active=1 AND s.status='published' GROUP BY i.module_type", [session.business_id, session.id]);
    } catch (error) {
        console.error("GUEST PUBLIC SESSION COMMERCE CAPABILITIES ERROR", error);
    }
    let reviewSlug = null;
    let reviewRating = null;
    try {
        const [reviewRows] = await db.query("SELECT p.slug FROM tags_qr_pages p INNER JOIN tags_business_addons a ON a.business_id=p.business_id AND a.addon_code='client_reviews' AND a.status='active' AND (a.expires_at IS NULL OR a.expires_at>=NOW()) WHERE p.business_id=? AND p.page_type='client_reviews' AND p.status='published' LIMIT 1", [session.business_id]);
        reviewSlug = reviewRows[0]?.slug || null;
        if (reviewSlug && (session.guest_email || session.guest_phone)) {
            const [reviewRowsForGuest] = await db.query("SELECT r.average_rating FROM tags_client_review_responses r INNER JOIN tags_qr_pages p ON p.id=r.page_id AND p.slug=? WHERE r.business_id=? AND ((? <> '' AND LOWER(r.customer_email)=LOWER(?)) OR (? <> '' AND r.customer_phone=?)) ORDER BY r.created_at DESC,r.id DESC LIMIT 1", [reviewSlug, session.business_id, session.guest_email || "", session.guest_email || "", session.guest_phone || "", session.guest_phone || ""]);
            reviewRating = reviewRowsForGuest[0]?.average_rating == null ? null : Number(reviewRowsForGuest[0].average_rating);
        }
    } catch (error) {
        console.error("GUEST PUBLIC SESSION REVIEWS CAPABILITY ERROR", error);
    }
    const capabilities = { store: commerceRows.some(item => item.module_type === "store"), resto: commerceRows.some(item => item.module_type === "resto"), reviews: Boolean(reviewSlug) };
    const unitName = ["active", "checked_out"].includes(session.stay_status) ? session.unit_name : null;
    return Response.json({ ok: true, experience: { name: session.name, logoUrl: session.logo_url, coverUrl: session.cover_url, welcomeMessage: session.welcome_message, settings, styles: parseGuestJson(session.styles_json), capabilities, reviewSlug, theme: theme ? { ...theme, css_tokens: parseGuestJson(theme.css_tokens) } : null }, stay: { code: session.stay_code, status: session.stay_status, startsAt: session.starts_at, endsAt: session.ends_at, adults: session.adults, children: session.children, unitName, precheckinStatus: session.precheckin_status || "draft" }, guest: { id: session.guest_id, name: session.guest_name, email: session.guest_email, phone: session.guest_phone }, review: reviewRating == null ? null : { rating: reviewRating } });
    } catch (error) {
        console.error("GUEST PUBLIC SESSION ERROR", error);
        return guestError("No pudimos cargar Mi Estadía en este momento", 500);
    }
}
