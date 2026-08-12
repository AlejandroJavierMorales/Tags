// =====================================
// Archivo:
// /app/modules/store/lib/getStorePublicProductDetail.js
//
// Descripción:
// Obtiene el detalle público de un producto,
// incluyendo tienda, imágenes y variantes.
//
// Contexto:
// store
// =====================================

import { db }
    from "@/app/lib/tags-db";

import {
    normalizeProductVariants
}
    from "@/app/modules/store/lib/normalizeProductVariants";

function safeParse(value) {
    if (!value) {
        return {};
    }
    if (typeof value === "object") {
        return value;
    }
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

export async function getStorePublicProductDetail({
    slug,
    productId
}) {

    if (!slug || !productId) {
        return null;
    }



    const [storeRows] =
        await db.execute(
            `
        SELECT
            s.*,
            qrp.theme_id,
            qrp.id AS public_page_id,
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
            b.facebook_url AS business_facebook_url
        FROM tags_stores s
        INNER JOIN tags_qr_pages qrp
            ON qrp.id = s.page_id
        INNER JOIN tags_businesses b
            ON b.id = s.business_id
        LEFT JOIN tags_qr_page_themes t
            ON t.id = qrp.theme_id
        WHERE (
                qrp.slug = ?
                OR s.slug = ?
            )
            AND qrp.page_type IN ('store', 'resto')
            AND (
                (qrp.status = 'published' AND s.status = 'published')
                OR (
                    EXISTS (
                        SELECT 1
                        FROM tags_business_addons ba_store
                        WHERE ba_store.business_id=s.business_id
                        AND ba_store.addon_code=IF(s.app_type='resto','resto','store')
                        AND ba_store.status='active'
                        AND (ba_store.expires_at IS NULL OR ba_store.expires_at>=NOW())
                    )
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
                slug,
                slug
            ]
        );

    const store =
        storeRows?.[0];

    if (!store) {
        return null;
    }

    store.settings_json =
        safeParse(
            store.settings_json
        );

    store.styles_json =
        safeParse(
            store.styles_json
        );

    store.logo_url = store.business_logo_url || store.logo_url;
    store.cover_url = store.business_cover_url || store.cover_url;
    store.email = store.business_email || store.email;
    store.phone = store.business_phone || store.phone;
    store.whatsapp = store.business_whatsapp || store.whatsapp;
    store.address = store.business_address || store.address;
    store.website_url = store.business_website_url || store.website_url;
    store.instagram_url = store.business_instagram_url || store.instagram_url;
    store.facebook_url = store.business_facebook_url || store.facebook_url;

    store.page_global_styles =
        safeParse(store.page_global_styles);

    const themeTokens =
        safeParse(
            store.theme_css_tokens
        );

    const customTokens =
        safeParse(
            store.styles_json?.css_tokens
        );

    store.theme_css_vars = {
        ...themeTokens,
        ...customTokens
    };



    const [productRows] =
        await db.execute(
            `
            SELECT
                p.*,
                c.name AS category_name,
                c.slug AS category_slug
            FROM tags_store_products p
            LEFT JOIN tags_store_categories c
                ON c.id = p.category_id
            WHERE p.id = ?
            AND p.store_id = ?
            AND p.is_visible = 1
            AND (? = 'resto' OR p.status = 'published')
            LIMIT 1
            `,
            [
                productId,
                store.id,
                store.app_type || "store"
            ]
        );

    const product =
        productRows?.[0];

    if (!product) {
        return null;
    }

    product.settings_json =
        safeParse(
            product.settings_json
        );

    const [images] =
        await db.execute(
            `
            SELECT *
            FROM tags_store_product_images
            WHERE product_id = ?
            ORDER BY
                is_primary DESC,
                sort_order ASC,
                id ASC
            `,
            [
                product.id
            ]
        );

    const [variantOptionRows] =
        await db.execute(
            `
            SELECT
                v.id AS variant_id,
                v.product_id,
                v.sku,
                v.title,
                v.price,
                v.sale_price,
                v.stock_qty,
                v.image_url,
                v.is_visible,
                v.created_at,
                v.updated_at,

                o.id AS option_id,
                o.name AS option_name,
                o.sort_order AS option_sort_order,

                ov.id AS value_id,
                ov.value AS value,
                ov.sort_order AS value_sort_order

            FROM tags_store_variants v

            LEFT JOIN tags_store_variant_values vv
                ON vv.variant_id = v.id

            LEFT JOIN tags_store_options o
                ON o.id = vv.option_id

            LEFT JOIN tags_store_option_values ov
                ON ov.id = vv.option_value_id

            WHERE v.product_id = ?
            AND v.is_visible = 1

            ORDER BY
                v.id ASC,
                o.sort_order ASC,
                ov.sort_order ASC
            `,
            [
                product.id
            ]
        );

    const variantMap =
        new Map();

    variantOptionRows.forEach(
        (row) => {

            if (
                !variantMap.has(
                    row.variant_id
                )
            ) {

                variantMap.set(
                    row.variant_id,
                    {
                        id:
                            row.variant_id,

                        product_id:
                            row.product_id,

                        sku:
                            row.sku,

                        title:
                            row.title,

                        price:
                            row.price,

                        sale_price:
                            row.sale_price,

                        stock_qty:
                            row.stock_qty,

                        image_url:
                            row.image_url,

                        is_visible:
                            row.is_visible,

                        created_at:
                            row.created_at,

                        updated_at:
                            row.updated_at,

                        options_json:
                            []
                    }
                );

            }

            if (
                row.option_id &&
                row.value_id
            ) {

                variantMap
                    .get(
                        row.variant_id
                    )
                    .options_json
                    .push({
                        option_id:
                            row.option_id,

                        option_name:
                            row.option_name,

                        option_sort_order:
                            row.option_sort_order,

                        value_id:
                            row.value_id,

                        value:
                            row.value,

                        value_sort_order:
                            row.value_sort_order
                    });

            }

        }
    );

    const {
        variants,
        variantOptions
    } =
        normalizeProductVariants(
            Array.from(
                variantMap.values()
            )
        );

    return {
        store,
        product,
        images,
        variants,
        variantOptions
    };

}
