// =====================================
// API: /api/store/admin/products/save
// Descripción: Crea o actualiza un producto de Tags Tienda.
// Uso: Dashboard Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function createSlug(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

function safe(value) {
    return value === undefined || value === ""
        ? null
        : value;
}

export async function POST(req) {
    const conn = await db.getConnection();

    try {
        const body = await req.json();

        const {
            businessId,
            productId,
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
            images
        } = body;

        if (!businessId) {
            return Response.json(
                { error: "businessId es requerido" },
                { status: 400 }
            );
        }

        if (!title) {
            return Response.json(
                { error: "El nombre del producto es requerido" },
                { status: 400 }
            );
        }

        const [storeRows] = await conn.query(
            `
            SELECT id
            FROM tags_stores
            WHERE business_id = ?
            LIMIT 1
            `,
            [businessId]
        );

        const store = storeRows[0];

        if (!store) {
            return Response.json(
                { error: "Tienda no encontrada" },
                { status: 404 }
            );
        }

        const cleanSlug = createSlug(slug || title);

        if (!cleanSlug) {
            return Response.json(
                { error: "Slug inválido" },
                { status: 400 }
            );
        }

        const [slugRows] = await conn.query(
            `
            SELECT id
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
                { error: "Ya existe un producto con esa URL" },
                { status: 409 }
            );
        }

        await conn.beginTransaction();

        let finalProductId = productId || null;

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
                    settings_json = ?
                WHERE id = ?
                AND store_id = ?
                `,
                [
                    safe(category_id),
                    safe(sku),
                    cleanSlug,
                    title,
                    safe(description),
                    Number(price || 0),
                    sale_price === "" || sale_price === undefined || sale_price === null
                        ? null
                        : Number(sale_price),
                    currency || "ARS",
                    Number(stock_enabled) === 1 ? 1 : 0,
                    Number(stock_qty || 0),
                    Number(is_featured) === 1 ? 1 : 0,
                    Number(is_offer) === 1 ? 1 : 0,
                    Number(is_new) === 1 ? 1 : 0,
                    Number(is_visible) === 0 ? 0 : 1,
                    status || "draft",
                    safe(seo_title),
                    safe(seo_description),
                    JSON.stringify(settings_json || {}),
                    productId,
                    store.id
                ]
            );
        } else {
            const [result] = await conn.query(
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
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `,
                [
                    store.id,
                    safe(category_id),
                    safe(sku),
                    cleanSlug,
                    title,
                    safe(description),
                    Number(price || 0),
                    sale_price === "" || sale_price === undefined || sale_price === null
                        ? null
                        : Number(sale_price),
                    currency || "ARS",
                    Number(stock_enabled) === 1 ? 1 : 0,
                    Number(stock_qty || 0),
                    Number(is_featured) === 1 ? 1 : 0,
                    Number(is_offer) === 1 ? 1 : 0,
                    Number(is_new) === 1 ? 1 : 0,
                    Number(is_visible) === 0 ? 0 : 1,
                    status || "draft",
                    safe(seo_title),
                    safe(seo_description),
                    JSON.stringify(settings_json || {})
                ]
            );

            finalProductId = result.insertId;
        }

        // =====================================
        // IMAGES
        // =====================================

        if (Array.isArray(images)) {
            await conn.query(
                `
                DELETE FROM tags_store_product_images
                WHERE product_id = ?
                `,
                [finalProductId]
            );

            for (let i = 0; i < images.length; i++) {
                const image = images[i];

                if (!image?.image_url) continue;

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
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    `,
                    [
                        finalProductId,
                        image.image_url,
                        safe(image.storage_path),
                        safe(image.original_filename),
                        image.width || null,
                        image.height || null,
                        image.size_bytes || null,
                        Number(image.sort_order || i),
                        i === 0 ? 1 : 0
                    ]
                );
            }
        }

        await conn.commit();

        return Response.json({
            ok: true,
            message: productId
                ? "Producto actualizado correctamente"
                : "Producto creado correctamente",
            productId: finalProductId
        });

    } catch (err) {
        await conn.rollback();

        console.error("STORE PRODUCT SAVE ERROR:", err);

        return Response.json(
            { error: "Error guardando producto" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}