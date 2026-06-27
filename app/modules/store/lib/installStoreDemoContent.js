// =====================================
// Archivo:
// /app/modules/store/lib/installStoreDemoContent.js
//
// Descripción:
// Instala contenido demo inicial
// para que una tienda nueva no se vea vacía.
//
// Crea:
// - Categorías demo
// - Productos demo
// - Imágenes demo
// - Productos destacados
//
// Utilizado por:
// - /api/store/admin/save
//
// Contexto:
// store
// =====================================

export async function installStoreDemoContent(
    storeId,
    conn
) {

    if (!storeId) {
        throw new Error(
            "storeId requerido"
        );
    }

    if (!conn) {
        throw new Error(
            "conn requerido"
        );
    }

    const demoImageBase =
        "/assets/images/store/demo";

    const demoCategories = [
        {
            name: "Destacados",
            slug: "destacados",
            description: "Productos destacados de la tienda.",
            sort_order: 1
        },
        {
            name: "Novedades",
            slug: "novedades",
            description: "Últimos productos agregados.",
            sort_order: 2
        },
        {
            name: "Ofertas",
            slug: "ofertas",
            description: "Promociones y oportunidades.",
            sort_order: 3
        }
    ];

    const categoryIds = {};

    for (const category of demoCategories) {

        const [existingRows] =
            await conn.execute(
                `
                SELECT id
                FROM tags_store_categories
                WHERE store_id = ?
                AND slug = ?
                LIMIT 1
                `,
                [
                    storeId,
                    category.slug
                ]
            );

        if (existingRows.length) {
            categoryIds[category.slug] =
                existingRows[0].id;

            continue;
        }

        const [result] =
            await conn.execute(
                `
                INSERT INTO tags_store_categories
                (
                    store_id,
                    parent_id,
                    name,
                    slug,
                    image_url,
                    description,
                    sort_order,
                    is_visible,
                    created_at,
                    updated_at
                )
                VALUES
                (?, NULL, ?, ?, NULL, ?, ?, 1, NOW(), NOW())
                `,
                [
                    storeId,
                    category.name,
                    category.slug,
                    category.description,
                    category.sort_order
                ]
            );

        categoryIds[category.slug] =
            result.insertId;

    }

    const demoProducts = [
        {
            category_slug: "destacados",
            slug: "producto-destacado",
            title: "Producto destacado",
            description: "Producto de ejemplo para mostrar cómo se verá tu tienda.",
            price: 25000,
            sale_price: 21900,
            is_featured: 1,
            image: "placeholder-product-1.webp"
        },
        {
            category_slug: "novedades",
            slug: "producto-nuevo",
            title: "Producto nuevo",
            description: "Ejemplo de producto publicado dentro del catálogo.",
            price: 18500,
            sale_price: null,
            is_featured: 1,
            image: "placeholder-product-2.webp"
        },
        {
            category_slug: "ofertas",
            slug: "producto-oferta",
            title: "Producto oferta",
            description: "Ejemplo de producto con precio promocional.",
            price: 32000,
            sale_price: 27900,
            is_featured: 0,
            image: "placeholder-product-3.webp"
        },
        {
            category_slug: "destacados",
            slug: "producto-clasico",
            title: "Producto clásico",
            description: "Producto de ejemplo para completar la grilla.",
            price: 14500,
            sale_price: null,
            is_featured: 0,
            image: "placeholder-product-4.webp"
        }
    ];

    for (const product of demoProducts) {

        const [existingProductRows] =
            await conn.execute(
                `
                SELECT id
                FROM tags_store_products
                WHERE store_id = ?
                AND slug = ?
                LIMIT 1
                `,
                [
                    storeId,
                    product.slug
                ]
            );

        let productId = null;

        if (existingProductRows.length) {

            productId =
                existingProductRows[0].id;

        } else {

            const [productResult] =
                await conn.execute(
                    `
                    INSERT INTO tags_store_products
                    (
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
                        requires_shipping,
                        is_featured,
                        is_visible,
                        status,
                        settings_json,
                        created_at,
                        updated_at
                    )
                    VALUES
                    (?, ?, NULL, ?, ?, ?, ?, ?, 'ARS', 0, 0, 1, ?, 1, 'published', JSON_OBJECT('is_demo', true), NOW(), NOW())
                    `,
                    [
                        storeId,
                        categoryIds[product.category_slug] || null,
                        product.slug,
                        product.title,
                        product.description,
                        product.price,
                        product.sale_price,
                        product.is_featured
                    ]
                );

            productId =
                productResult.insertId;

        }

        const [existingImageRows] =
            await conn.execute(
                `
                SELECT id
                FROM tags_store_product_images
                WHERE product_id = ?
                AND is_primary = 1
                LIMIT 1
                `,
                [
                    productId
                ]
            );

        if (!existingImageRows.length) {

            await conn.execute(
                `
                INSERT INTO tags_store_product_images
                (
                    product_id,
                    image_url,
                    storage_path,
                    original_filename,
                    sort_order,
                    is_primary,
                    created_at
                )
                VALUES
                (?, ?, NULL, ?, 1, 1, NOW())
                `,
                [
                    productId,
                    `${demoImageBase}/${product.image}`,
                    product.image
                ]
            );

        }

    }

    return {
        success: true
    };

}