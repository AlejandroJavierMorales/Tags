// =====================================
// LIB: updateOrderStock
// Descripción: Gestiona reserva, confirmación y devolución de stock de Tags Tienda.
// Modelo: el pedido reserva stock al crearse y descuenta stock real al confirmarse/pagarse.
// =====================================

export async function getReservedStockForProduct(
    conn,
    productId,
    excludeOrderId = null
) {
    const [rows] =
        await conn.query(
            `
            SELECT
                COALESCE(SUM(oi.quantity), 0) AS reserved_qty
            FROM tags_store_order_items oi
            INNER JOIN tags_store_orders o
                ON o.id = oi.order_id
            WHERE oi.product_id = ?
            AND oi.variant_id IS NULL
            AND o.stock_reserved = 1
            AND o.order_status != 'cancelled'
            ${excludeOrderId ? "AND o.id != ?" : ""}
            `,
            excludeOrderId
                ? [productId, excludeOrderId]
                : [productId]
        );

    return Number(rows[0]?.reserved_qty || 0);
}

export async function getReservedStockForVariant(
    conn,
    variantId,
    excludeOrderId = null
) {
    const [rows] =
        await conn.query(
            `
            SELECT
                COALESCE(SUM(oi.quantity), 0) AS reserved_qty
            FROM tags_store_order_items oi
            INNER JOIN tags_store_orders o
                ON o.id = oi.order_id
            WHERE oi.variant_id = ?
            AND o.stock_reserved = 1
            AND o.order_status != 'cancelled'
            ${excludeOrderId ? "AND o.id != ?" : ""}
            `,
            excludeOrderId
                ? [variantId, excludeOrderId]
                : [variantId]
        );

    return Number(rows[0]?.reserved_qty || 0);
}

export async function confirmOrderStock(conn, orderId) {
    const [items] =
        await conn.query(
            `
            SELECT
                product_id,
                variant_id,
                quantity
            FROM tags_store_order_items
            WHERE order_id = ?
            `,
            [orderId]
        );

    for (const item of items) {
        const qty =
            Number(item.quantity || 0);

        if (qty <= 0) {
            continue;
        }

        if (item.variant_id) {
            const [result] =
                await conn.query(
                    `
                    UPDATE tags_store_variants
                    SET stock_qty = stock_qty - ?
                    WHERE id = ?
                    AND stock_qty >= ?
                    `,
                    [
                        qty,
                        item.variant_id,
                        qty
                    ]
                );

            if (result.affectedRows === 0) {
                throw new Error(
                    "Stock insuficiente para confirmar el pedido"
                );
            }

        } else {
            const [result] =
                await conn.query(
                    `
                    UPDATE tags_store_products
                    SET stock_qty = stock_qty - ?
                    WHERE id = ?
                    AND stock_enabled = 1
                    AND stock_qty >= ?
                    `,
                    [
                        qty,
                        item.product_id,
                        qty
                    ]
                );

            if (result.affectedRows === 0) {
                throw new Error(
                    "Stock insuficiente para confirmar el pedido"
                );
            }
        }
    }
}

export async function restoreConfirmedOrderStock(conn, orderId) {
    const [items] =
        await conn.query(
            `
            SELECT
                product_id,
                variant_id,
                quantity
            FROM tags_store_order_items
            WHERE order_id = ?
            `,
            [orderId]
        );

    for (const item of items) {
        const qty =
            Number(item.quantity || 0);

        if (qty <= 0) {
            continue;
        }

        if (item.variant_id) {
            await conn.query(
                `
                UPDATE tags_store_variants
                SET stock_qty = stock_qty + ?
                WHERE id = ?
                `,
                [
                    qty,
                    item.variant_id
                ]
            );

        } else {
            await conn.query(
                `
                UPDATE tags_store_products
                SET stock_qty = stock_qty + ?
                WHERE id = ?
                AND stock_enabled = 1
                `,
                [
                    qty,
                    item.product_id
                ]
            );
        }
    }
}