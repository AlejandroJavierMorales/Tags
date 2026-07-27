import {
    getReservedStockForProduct,
    getReservedStockForVariant
} from "@/app/modules/store/lib/updateOrderStock";

function validPositiveInteger(value) {
    const number = Number(value);

    return Number.isInteger(number) &&
        number > 0
        ? number
        : null;
}

export async function canonicalizeStoreOrderItems(
    conn,
    {
        storeId,
        items
    }
) {
    const normalized = [];

    for (const item of items) {
        const productId =
            validPositiveInteger(
                item.product_id
            );

        const variantId =
            item.variant_id
                ? validPositiveInteger(
                    item.variant_id
                )
                : null;

        const quantity =
            validPositiveInteger(
                item.quantity
            );

        if (
            !productId ||
            !quantity ||
            quantity > 100
        ) {
            throw Object.assign(
                new Error(
                    "Producto o cantidad inválidos"
                ),
                { status: 400 }
            );
        }

        if (variantId) {
            const [rows] =
                await conn.query(
                    `
                    SELECT
                        v.id,
                        v.product_id,
                        v.title AS variant_title,
                        v.sku,
                        v.price,
                        v.sale_price,
                        v.stock_qty,
                        v.is_visible,
                        p.title AS product_title,
                        p.price AS product_price,
                        p.sale_price AS product_sale_price,
                        p.status,
                        p.is_visible AS product_visible
                    FROM tags_store_variants v
                    INNER JOIN tags_store_products p
                        ON p.id = v.product_id
                    WHERE v.id = ?
                    AND v.product_id = ?
                    AND p.store_id = ?
                    LIMIT 1
                    FOR UPDATE
                    `,
                    [
                        variantId,
                        productId,
                        storeId
                    ]
                );

            const variant = rows[0];

            if (
                !variant ||
                variant.status !== "published" ||
                Number(variant.product_visible) !== 1 ||
                Number(variant.is_visible) !== 1
            ) {
                throw Object.assign(
                    new Error(
                        "Producto o variante no disponible"
                    ),
                    { status: 409 }
                );
            }

            const reserved =
                await getReservedStockForVariant(
                    conn,
                    variantId
                );

            if (
                Number(variant.stock_qty || 0) -
                    reserved <
                quantity
            ) {
                throw Object.assign(
                    new Error(
                        `Stock insuficiente para ${variant.product_title}`
                    ),
                    { status: 409 }
                );
            }

            const unitPrice =
                Number(
                    variant.sale_price ??
                    variant.price ??
                    variant.product_sale_price ??
                    variant.product_price ??
                    0
                );

            normalized.push({
                product_id: productId,
                variant_id: variantId,
                product_title:
                    variant.product_title,
                variant_title:
                    variant.variant_title,
                sku: variant.sku,
                quantity,
                unit_price: unitPrice,
                total_price:
                    unitPrice * quantity,
                options: {}
            });

            continue;
        }

        const [rows] =
            await conn.query(
                `
                SELECT
                    id,
                    title,
                    sku,
                    price,
                    sale_price,
                    status,
                    is_visible,
                    stock_enabled,
                    stock_qty
                FROM tags_store_products
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [
                    productId,
                    storeId
                ]
            );

        const product = rows[0];

        if (
            !product ||
            product.status !== "published" ||
            Number(product.is_visible) !== 1
        ) {
            throw Object.assign(
                new Error(
                    "Producto no disponible"
                ),
                { status: 409 }
            );
        }

        if (Number(product.stock_enabled) === 1) {
            const reserved =
                await getReservedStockForProduct(
                    conn,
                    productId
                );

            if (
                Number(product.stock_qty || 0) -
                    reserved <
                quantity
            ) {
                throw Object.assign(
                    new Error(
                        `Stock insuficiente para ${product.title}`
                    ),
                    { status: 409 }
                );
            }
        }

        const unitPrice =
            Number(
                product.sale_price ??
                product.price ??
                0
            );

        normalized.push({
            product_id: productId,
            variant_id: null,
            product_title: product.title,
            variant_title: null,
            sku: product.sku,
            quantity,
            unit_price: unitPrice,
            total_price:
                unitPrice * quantity,
            options: {}
        });
    }

    return normalized;
}
