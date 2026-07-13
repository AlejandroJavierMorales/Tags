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
            t.code AS theme_code,
            t.name AS theme_name,
            t.css_tokens AS theme_css_tokens
        FROM tags_stores s
        INNER JOIN tags_qr_pages qrp
            ON qrp.id = s.page_id
        LEFT JOIN tags_qr_page_themes t
            ON t.id = qrp.theme_id
        WHERE (
                qrp.slug = ?
                OR s.slug = ?
            )
            AND qrp.page_type = 'store'
            AND qrp.status = 'published'
            AND s.status = 'published'
            LIMIT 1
        `,
            [
                slug,
                slug
            ]
        );

    const store =
        storeRows?.[0];

    console.log("STORE ROWS DETAIL:", storeRows);

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
            AND p.status = 'published'
            LIMIT 1
            `,
            [
                productId,
                store.id
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