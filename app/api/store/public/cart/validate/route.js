// =====================================
// API: /api/store/public/cart/validate
// Descripción: Valida disponibilidad del carrito público antes de avanzar al checkout.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import {
    getReservedStockForProduct,
    getReservedStockForVariant
}
from "@/app/modules/store/lib/updateOrderStock";

function cleanId(value) {
    const n = Number(value);

    return Number.isFinite(n) && n > 0
        ? n
        : null;
}

export async function POST(req) {
    const conn =
        await db.getConnection();

    try {
        const body =
            await req.json();

        const {
            storeId,
            items = []
        } = body;

        const cleanStoreId =
            cleanId(storeId);

        if (!cleanStoreId) {
            return Response.json(
                { error: "storeId es requerido" },
                { status: 400 }
            );
        }

        if (!Array.isArray(items) || !items.length) {
            return Response.json(
                { error: "El carrito está vacío" },
                { status: 400 }
            );
        }

        const errors =
            [];

        for (const item of items) {
            const productId =
                cleanId(item.product_id);

            const variantId =
                cleanId(item.variant_id);

            const quantity =
                Math.max(
                    1,
                    Number(item.quantity || 1)
                );

            if (!productId) {
                errors.push({
                    product_id: item.product_id || null,
                    variant_id: item.variant_id || null,
                    requested: quantity,
                    available: 0,
                    message: "Producto inválido."
                });

                continue;
            }

            if (variantId) {
                const [variantRows] =
                    await conn.query(
                        `
                        SELECT
                            v.id,
                            v.product_id,
                            v.title AS variant_title,
                            v.stock_qty,
                            v.is_visible,
                            p.title AS product_title,
                            p.store_id,
                            p.status,
                            p.is_visible AS product_visible,
                            p.stock_enabled
                        FROM tags_store_variants v
                        INNER JOIN tags_store_products p
                            ON p.id = v.product_id
                        WHERE v.id = ?
                        AND v.product_id = ?
                        AND p.store_id = ?
                        LIMIT 1
                        `,
                        [
                            variantId,
                            productId,
                            cleanStoreId
                        ]
                    );

                const variant =
                    variantRows[0];

                if (!variant) {
                    errors.push({
                        product_id: productId,
                        variant_id: variantId,
                        requested: quantity,
                        available: 0,
                        message: "Variante inexistente."
                    });

                    continue;
                }

                if (
                    variant.status !== "published" ||
                    Number(variant.product_visible) !== 1 ||
                    Number(variant.is_visible) !== 1
                ) {
                    errors.push({
                        product_id: productId,
                        variant_id: variantId,
                        title: variant.product_title,
                        variant_title: variant.variant_title,
                        requested: quantity,
                        available: 0,
                        message: "Este producto ya no está disponible."
                    });

                    continue;
                }

                const reservedQty =
                    await getReservedStockForVariant(
                        conn,
                        variantId
                    );

                const availableQty =
                    Number(variant.stock_qty || 0) -
                    reservedQty;

                if (availableQty < quantity) {
                    errors.push({
                        product_id: productId,
                        variant_id: variantId,
                        title: variant.product_title,
                        variant_title: variant.variant_title,
                        requested: quantity,
                        available: Math.max(0, availableQty),
                        message:
                            `Stock insuficiente para ${variant.product_title}${variant.variant_title ? ` - ${variant.variant_title}` : ""}. Disponible: ${Math.max(0, availableQty)}.`
                    });
                }

                continue;
            }

            const [productRows] =
                await conn.query(
                    `
                    SELECT
                        id,
                        title,
                        store_id,
                        status,
                        is_visible,
                        stock_enabled,
                        stock_qty
                    FROM tags_store_products
                    WHERE id = ?
                    AND store_id = ?
                    LIMIT 1
                    `,
                    [
                        productId,
                        cleanStoreId
                    ]
                );

            const product =
                productRows[0];

            if (!product) {
                errors.push({
                    product_id: productId,
                    variant_id: null,
                    requested: quantity,
                    available: 0,
                    message: "Producto inexistente."
                });

                continue;
            }

            if (
                product.status !== "published" ||
                Number(product.is_visible) !== 1
            ) {
                errors.push({
                    product_id: productId,
                    variant_id: null,
                    title: product.title,
                    requested: quantity,
                    available: 0,
                    message: "Este producto ya no está disponible."
                });

                continue;
            }

            if (Number(product.stock_enabled) === 1) {
                const reservedQty =
                    await getReservedStockForProduct(
                        conn,
                        productId
                    );

                const availableQty =
                    Number(product.stock_qty || 0) -
                    reservedQty;

                if (availableQty < quantity) {
                    errors.push({
                        product_id: productId,
                        variant_id: null,
                        title: product.title,
                        requested: quantity,
                        available: Math.max(0, availableQty),
                        message:
                            `Stock insuficiente para ${product.title}. Disponible: ${Math.max(0, availableQty)}.`
                    });
                }
            }
        }

        if (errors.length) {
            return Response.json(
                {
                    ok: false,
                    errors,
                    error: errors[0].message
                },
                { status: 409 }
            );
        }

        return Response.json({
            ok: true
        });

    } catch (err) {
        console.error(
            "STORE CART VALIDATE ERROR:",
            err
        );

        return Response.json(
            { error: "Error validando carrito" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}