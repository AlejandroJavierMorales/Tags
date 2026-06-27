// =====================================
// PAGE: /p/[slug]/products/[productId]
// Descripción: Página pública de detalle de producto de Tags Tienda.
// =====================================

import { notFound } from "next/navigation";

import { db } from "@/app/lib/tags-db";
import StoreProductDetailRenderer from "@/app/modules/store/public/StoreProductDetailRenderer";



export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseJson(value, fallback = {}) {
    if (!value) return fallback;
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

async function getStoreProduct({
    slug,
    productId
}) {
    const [rows] =
        await db.query(
            `
            SELECT
                s.*,

                p.id AS product_id,
                p.category_id,
                p.sku,
                p.slug AS product_slug,
                p.title AS product_title,
                p.description AS product_description,
                p.price,
                p.sale_price,
                p.currency AS product_currency,
                p.stock_enabled,
                p.stock_qty,
                p.is_featured,
                p.seo_title AS product_seo_title,
                p.seo_description AS product_seo_description,

                c.name AS category_name

            FROM tags_stores s

            INNER JOIN tags_qr_pages qrp
                ON qrp.id = s.page_id

            INNER JOIN tags_store_products p
                ON p.store_id = s.id

            LEFT JOIN tags_store_categories c
                ON c.id = p.category_id

            WHERE s.slug = ?
            AND s.status = 'published'
            AND qrp.status = 'published'
            AND qrp.page_type = 'store'
            AND p.id = ?
            AND p.status = 'published'
            AND p.is_visible = 1

            LIMIT 1
            `,
            [
                slug,
                productId
            ]
        );

    const row =
        rows[0];

    if (!row) {
        return null;
    }

    const store = {
        id: row.id,
        business_id: row.business_id,
        page_id: row.page_id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        logo_url: row.logo_url,
        cover_url: row.cover_url,
        whatsapp: row.whatsapp,
        email: row.email,
        address: row.address,
        currency: row.currency || "ARS",
        status: row.status,
        seo_title: row.seo_title,
        seo_description: row.seo_description,
        settings_json: parseJson(row.settings_json, {}),
        styles_json: parseJson(row.styles_json, {})
    };

    const product = {
        id: row.product_id,
        category_id: row.category_id,
        category_name: row.category_name,
        sku: row.sku,
        slug: row.product_slug,
        title: row.product_title,
        description: row.product_description,
        price: row.price,
        sale_price: row.sale_price,
        currency: row.product_currency || store.currency || "ARS",
        stock_enabled: row.stock_enabled,
        stock_qty: row.stock_qty,
        is_featured: row.is_featured,
        seo_title: row.product_seo_title,
        seo_description: row.product_seo_description
    };

    const [images] =
        await db.query(
            `
            SELECT *
            FROM tags_store_product_images
            WHERE product_id = ?
            ORDER BY sort_order ASC, id ASC
            `,
            [
                product.id
            ]
        );

    const [variants] =
        await db.query(
            `
            SELECT
                v.*,

                GROUP_CONCAT(
                    CONCAT(o.name, ': ', ov.value)
                    ORDER BY o.sort_order ASC
                    SEPARATOR ' | '
                ) AS options_label

            FROM tags_store_variants v

            LEFT JOIN tags_store_variant_values vv
                ON vv.variant_id = v.id

            LEFT JOIN tags_store_options o
                ON o.id = vv.option_id

            LEFT JOIN tags_store_option_values ov
                ON ov.id = vv.option_value_id

            WHERE v.product_id = ?
            AND v.is_visible = 1

            GROUP BY
                v.id,
                v.product_id,
                v.sku,
                v.title,
                v.price,
                v.sale_price,
                v.stock_qty,
                v.image_url,
                v.is_visible,
                v.created_at,
                v.updated_at

            ORDER BY v.id ASC
            `,
            [
                product.id
            ]
        );

    return {
        store,
        product,
        images,
        variants
    };
}

export default async function StoreProductPage({
    params
}) {
    const {
        slug,
        productId
    } = await params;

    const data =
        await getStoreProduct({
            slug,
            productId
        });

    if (!data) {
        notFound();
    }

    return (
        <StoreProductDetailRenderer
            store={data.store}
            product={data.product}
            images={data.images}
            variants={data.variants}
        />
    );
}