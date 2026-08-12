import { db } from "@/app/lib/tags-db";
import { safeParseJSON } from "@/app/modules/qr-page/lib/safeParseJSON";

export async function getDirectoryEmbeddedReviews(businessId, limit = 20) {
    if (!businessId) return null;

    const [forms] = await db.query(
        `SELECT
            f.id,
            f.title,
            f.subtitle,
            f.logo_url,
            f.positive_threshold,
            f.theme_id,
            f.settings_json,
            f.styles_json,
            p.id AS page_id,
            p.slug,
            p.global_styles AS page_global_styles,
            t.code AS theme_code,
            t.name AS theme_name,
            t.css_tokens AS theme_css_tokens
         FROM tags_client_review_forms f
         INNER JOIN tags_qr_pages p
            ON p.id = f.page_id
            AND p.page_type = 'client_reviews'
            AND p.status = 'published'
         INNER JOIN tags_business_addons ba
            ON ba.business_id = f.business_id
            AND ba.addon_code = 'client_reviews'
            AND ba.status = 'active'
            AND (ba.expires_at IS NULL OR ba.expires_at >= NOW())
         LEFT JOIN tags_qr_page_themes t
            ON t.id = COALESCE(f.theme_id, p.theme_id)
         WHERE f.business_id = ?
         AND f.status = 'active'
         ORDER BY f.id DESC
         LIMIT 1`,
        [businessId]
    );

    const form = forms[0];
    if (!form) return null;

    const safeLimit = Math.min(30, Math.max(1, Number(limit || 20)));
    const [reviews] = await db.query(
        `SELECT
            id,
            customer_name,
            general_comment,
            average_rating,
            verified_purchase,
            created_at
         FROM tags_client_review_responses
         WHERE business_id = ?
         AND form_id = ?
         AND is_public = 1
         ORDER BY created_at DESC, id DESC
         LIMIT ${safeLimit}`,
        [businessId, form.id]
    );

    const normalized = reviews.map(review => ({
        ...review,
        average_rating: Number(review.average_rating || 0),
        verified_purchase: Number(review.verified_purchase || 0) === 1
    }));
    const average = normalized.length
        ? normalized.reduce((total, review) => total + review.average_rating, 0) / normalized.length
        : 0;

    return {
        form: {
            ...form,
            settings_json: safeParseJSON(form.settings_json),
            styles_json: safeParseJSON(form.styles_json),
            page_global_styles: safeParseJSON(form.page_global_styles)
        },
        theme: form.theme_id ? {
            id: Number(form.theme_id),
            code: form.theme_code,
            name: form.theme_name,
            css_tokens: safeParseJSON(form.theme_css_tokens)
        } : null,
        reviews: normalized,
        summary: {
            count: normalized.length,
            average
        }
    };
}
