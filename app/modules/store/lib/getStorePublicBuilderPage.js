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

            t.code AS theme_code,
            t.name AS theme_name,
            t.css_tokens AS theme_css_tokens,

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

        LEFT JOIN tags_qr_page_themes t
            ON t.id = qrp.theme_id

        WHERE qrp.slug = ?
        AND qrp.page_type = 'store'
        AND qrp.status = 'published'
        AND s.status = 'published'

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