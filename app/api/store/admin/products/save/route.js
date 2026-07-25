// =====================================
// API: /api/store/admin/products/save
// Descripción:
// Crea o actualiza un producto.
// Compatible con Tags Store y Tags Resto.
// Las imágenes se guardan exclusivamente en
// tags_store_product_images.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

const VALID_APP_TYPES = [
    "store",
    "resto"
];

function createSlug(value) {

    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /(^-|-$)+/g,
            ""
        );

}

function safe(value) {

    return (
        value === undefined ||
        value === ""
    )
        ? null
        : value;

}

export async function POST(req) {

    const conn =
        await db.getConnection();

    let transactionStarted =
        false;

    try {

        const body =
            await req.json();

        const {
            businessId,
            appType = "store",
            productId,
            category_id,
            sku,
            slug,
            title,
            description,
            image_url,
            price,
            sale_price,
            currency,
            stock_enabled,
            stock_control,
            stock_qty,
            is_featured,
            is_offer,
            is_new,
            is_visible,
            status,
            seo_title,
            seo_description,
            settings_json,
            images,
            requires_preparation
        } = body;

        if (!businessId) {

            return Response.json(
                {
                    error:
                        "businessId es requerido"
                },
                {
                    status: 400
                }
            );

        }

        if (
            !VALID_APP_TYPES.includes(
                appType
            )
        ) {

            return Response.json(
                {
                    error:
                        "appType inválido"
                },
                {
                    status: 400
                }
            );

        }

        if (!title?.trim()) {

            return Response.json(
                {
                    error:
                        "El nombre del producto es requerido"
                },
                {
                    status: 400
                }
            );

        }

        const [storeRows] =
            await conn.query(
                `
                SELECT
                    id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = ?
                LIMIT 1
                `,
                [
                    businessId,
                    appType
                ]
            );

        const store =
            storeRows[0];

        if (!store) {

            return Response.json(
                {
                    error:
                        appType === "resto"
                            ? "Tags Resto no encontrado"
                            : "Tienda no encontrada"
                },
                {
                    status: 404
                }
            );

        }

        if (category_id) {

            const [categoryRows] =
                await conn.query(
                    `
                    SELECT
                        id
                    FROM tags_store_categories
                    WHERE id = ?
                    AND store_id = ?
                    LIMIT 1
                    `,
                    [
                        category_id,
                        store.id
                    ]
                );

            if (!categoryRows.length) {

                return Response.json(
                    {
                        error:
                            "La categoría seleccionada no pertenece a esta aplicación"
                    },
                    {
                        status: 400
                    }
                );

            }

        }

        if (productId) {

            const [productRows] =
                await conn.query(
                    `
                    SELECT
                        id
                    FROM tags_store_products
                    WHERE id = ?
                    AND store_id = ?
                    LIMIT 1
                    `,
                    [
                        productId,
                        store.id
                    ]
                );

            if (!productRows.length) {

                return Response.json(
                    {
                        error:
                            "Producto no encontrado"
                    },
                    {
                        status: 404
                    }
                );

            }

        }

        const cleanSlug =
            createSlug(
                slug ||
                title
            );

        if (!cleanSlug) {

            return Response.json(
                {
                    error:
                        "Slug inválido"
                },
                {
                    status: 400
                }
            );

        }

        const [slugRows] =
            await conn.query(
                `
                SELECT
                    id
                FROM tags_store_products
                WHERE store_id = ?
                AND slug = ?
                AND id <> ?
                LIMIT 1
                `,
                [
                    store.id,
                    cleanSlug,
                    productId || 0
                ]
            );

        if (slugRows.length) {

            return Response.json(
                {
                    error:
                        "Ya existe un producto con esa URL"
                },
                {
                    status: 409
                }
            );

        }

        const resolvedStockEnabled =
            stock_enabled !== undefined
                ? stock_enabled
                : stock_control;

        /*
         * Tags Store puede enviar images[].
         * El editor simple de Resto envía image_url.
         * Ambos formatos terminan en
         * tags_store_product_images.
         */
        const normalizedImages =
            Array.isArray(images)
                ? images
                : image_url
                    ? [
                        {
                            image_url,
                            sort_order: 0,
                            is_primary: 1
                        }
                    ]
                    : null;

        await conn.beginTransaction();

        transactionStarted =
            true;

        let finalProductId =
            productId || null;

        if (productId) {

            await conn.query(
                `
                UPDATE tags_store_products
                SET
                    category_id = ?,
                    sku = ?,
                    slug = ?,
                    title = ?,
                    description = ?,
                    price = ?,
                    sale_price = ?,
                    currency = ?,
                    stock_enabled = ?,
                    stock_qty = ?,
                    is_featured = ?,
                    is_offer = ?,
                    is_new = ?,
                    is_visible = ?,
                    status = ?,
                    seo_title = ?,
                    seo_description = ?,
                    settings_json = ?,
                    requires_preparation = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND store_id = ?
                `,
                [
                    safe(category_id),
                    safe(sku),
                    cleanSlug,
                    title.trim(),
                    safe(description),
                    Number(price || 0),
                    (
                        sale_price === "" ||
                        sale_price === undefined ||
                        sale_price === null
                    )
                        ? null
                        : Number(sale_price),
                    currency || "ARS",
                    Number(resolvedStockEnabled) === 1
                        ? 1
                        : 0,
                    Number(stock_qty || 0),
                    Number(is_featured) === 1
                        ? 1
                        : 0,
                    Number(is_offer) === 1
                        ? 1
                        : 0,
                    Number(is_new) === 1
                        ? 1
                        : 0,
                    Number(is_visible) === 0
                        ? 0
                        : 1,
                    status || "draft",
                    safe(seo_title),
                    safe(seo_description),
                    JSON.stringify(
                        settings_json || {}
                    ),

                    Number(requires_preparation) === 0
                        ? 0
                        : 1,

                    productId,
                    store.id
                ]
            );

        } else {

            const [result] =
                await conn.query(
                    `
                    INSERT INTO tags_store_products (
                        store_id,
                        category_id,
                        sku,
                        slug,
                        title,
                        description,
                        price,
                        sale_price,
                        currency,
                        stock_enabled,
                        stock_qty,
                        is_featured,
                        is_offer,
                        is_new,
                        is_visible,
                        status,
                        seo_title,
                        seo_description,
                        settings_json,
                        requires_preparation,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        NOW(),
                        NOW()
                    )
                    `,
                    [
                        store.id,
                        safe(category_id),
                        safe(sku),
                        cleanSlug,
                        title.trim(),
                        safe(description),
                        Number(price || 0),
                        (
                            sale_price === "" ||
                            sale_price === undefined ||
                            sale_price === null
                        )
                            ? null
                            : Number(sale_price),
                        currency || "ARS",
                        Number(resolvedStockEnabled) === 1
                            ? 1
                            : 0,
                        Number(stock_qty || 0),
                        Number(is_featured) === 1
                            ? 1
                            : 0,
                        Number(is_offer) === 1
                            ? 1
                            : 0,
                        Number(is_new) === 1
                            ? 1
                            : 0,
                        Number(is_visible) === 0
                            ? 0
                            : 1,
                        status || "draft",
                        safe(seo_title),
                        safe(seo_description),
                        JSON.stringify(
                            settings_json || {}
                        ),
                        Number(requires_preparation) === 0
                            ? 0
                            : 1
                    ]
                );

            finalProductId =
                result.insertId;

        }

        if (normalizedImages !== null) {

            await conn.query(
                `
                DELETE
                FROM tags_store_product_images
                WHERE product_id = ?
                `,
                [
                    finalProductId
                ]
            );

            for (
                let index = 0;
                index < normalizedImages.length;
                index++
            ) {

                const image =
                    normalizedImages[index];

                if (!image?.image_url) {
                    continue;
                }

                await conn.query(
                    `
                    INSERT INTO tags_store_product_images (
                        product_id,
                        image_url,
                        storage_path,
                        original_filename,
                        width,
                        height,
                        size_bytes,
                        sort_order,
                        is_primary,
                        created_at
                    )
                    VALUES (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        NOW()
                    )
                    `,
                    [
                        finalProductId,
                        image.image_url,
                        safe(
                            image.storage_path
                        ),
                        safe(
                            image.original_filename
                        ),
                        image.width || null,
                        image.height || null,
                        image.size_bytes || null,
                        Number(
                            image.sort_order ?? index
                        ),
                        index === 0
                            ? 1
                            : 0
                    ]
                );

            }

        }

        await conn.commit();

        transactionStarted =
            false;

        return Response.json({
            ok: true,
            appType,
            message:
                productId
                    ? "Producto actualizado correctamente"
                    : "Producto creado correctamente",
            productId:
                finalProductId
        });

    } catch (err) {

        if (transactionStarted) {

            await conn.rollback();

        }

        console.error(
            "STORE PRODUCT SAVE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error guardando producto"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }

}