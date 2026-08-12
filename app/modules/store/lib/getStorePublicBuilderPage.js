// =====================================
// Archivo:
// /app/modules/store/lib/getStorePublicBuilderPage.js
//
// Descripción:
// Obtiene una tienda pública publicada
// con secciones y bloques del builder.
//
// Contexto:
// store
// =====================================

import { db }
    from "@/app/lib/tags-db";

function safeParse(value) {
    if (!value) return {};
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

export async function getStorePublicBuilderPage(slug) {

    const [storeRows] =
        await db.execute(
            `
        SELECT
            s.*,
            qrp.theme_id,
            qrp.global_styles AS page_global_styles,

            t.code AS theme_code,
            t.name AS theme_name,
            t.css_tokens AS theme_css_tokens,

            b.logo_url AS business_logo_url,
            b.cover_url AS business_cover_url,
            b.email AS business_email,
            b.phone AS business_phone,
            b.whatsapp AS business_whatsapp,
            b.address AS business_address,
            b.website_url AS business_website_url,
            b.instagram_url AS business_instagram_url,
            b.facebook_url AS business_facebook_url,

            EXISTS (
                SELECT 1
                FROM tags_business_addons ba
                WHERE ba.business_id = s.business_id
                AND ba.addon_code = 'client_reviews'
                AND ba.status = 'active'
            ) AS has_reviews

        FROM tags_stores s

        INNER JOIN tags_qr_pages qrp
            ON qrp.id = s.page_id

        INNER JOIN tags_businesses b
            ON b.id = s.business_id

        LEFT JOIN tags_qr_page_themes t
            ON t.id = qrp.theme_id

        WHERE qrp.slug = ?
        AND qrp.page_type = 'store'
        AND (
            (qrp.status = 'published' AND s.status = 'published')
            OR (
                EXISTS (SELECT 1 FROM tags_business_addons ba_store WHERE ba_store.business_id=s.business_id AND ba_store.addon_code='store' AND ba_store.status='active' AND (ba_store.expires_at IS NULL OR ba_store.expires_at>=NOW()))
                AND EXISTS (
                    SELECT 1 FROM tags_directory_listings dl
                    INNER JOIN tags_directory_site_listings dsl ON dsl.listing_id=dl.id AND dsl.publication_status='published' AND dsl.is_free=0
                    INNER JOIN tags_qr_pages dp ON dp.id=dl.qr_page_id AND dp.page_type='directory' AND dp.status='published'
                    WHERE dl.business_id=s.business_id AND dl.status='published'
                )
            )
        )

        LIMIT 1
        `,
            [
                slug
            ]
        );

    const store =
        storeRows?.[0];


    if (!store) {
        return null;
    }

    store.settings_json =
        safeParse(store.settings_json);

    store.styles_json =
        safeParse(store.styles_json);

    store.logo_url = store.business_logo_url || store.logo_url;
    store.cover_url = store.business_cover_url || store.cover_url;
    store.email = store.business_email || store.email;
    store.phone = store.business_phone || store.phone;
    store.whatsapp = store.business_whatsapp || store.whatsapp;
    store.address = store.business_address || store.address;
    store.website_url = store.business_website_url || store.website_url;
    store.instagram_url = store.business_instagram_url || store.instagram_url;
    store.facebook_url = store.business_facebook_url || store.facebook_url;

    const themeTokens =
        safeParse(store.theme_css_tokens);

    const customTokens =
        safeParse(store.styles_json?.css_tokens);

    store.theme_css_vars = {
        ...themeTokens,
        ...customTokens
    };

    store.has_reviews =
        Number(store.has_reviews) === 1;

    const [sections] =
        await db.execute(
            `
            SELECT *
            FROM tags_store_sections
            WHERE store_id = ?
            AND is_visible = 1
            ORDER BY sort_order ASC
            `,
            [store.id]
        );

    const [blocks] =
        await db.execute(
            `
            SELECT b.*
            FROM tags_store_blocks b
            INNER JOIN tags_store_sections s
                ON s.id = b.section_id
            WHERE s.store_id = ?
            AND s.is_visible = 1
            AND b.is_visible = 1
            ORDER BY
                s.sort_order ASC,
                b.sort_order ASC
            `,
            [store.id]
        );


    return {
        store,
        sections: sections.map(section => ({
            ...section,
            settings_json: safeParse(section.settings_json)
        })),
        blocks: blocks.map(block => ({
            ...block,
            content_json: safeParse(block.content_json),
            styles_json: safeParse(block.styles_json),
            animation_json: safeParse(block.animation_json)
        }))
    };
}
