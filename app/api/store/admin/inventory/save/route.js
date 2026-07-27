// =====================================
// API: /api/store/admin/inventory/save
// Descripción: Guarda cambios masivos de inventario de Tags Tienda.
// Uso: Gestión masiva de precios, ofertas, stock y visibilidad.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function toNumber(value, fallback = 0) {
    if (value === "" || value === null || value === undefined) {
        return fallback;
    }

    const n =
        Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}

function toNullableNumber(value) {
    if (value === "" || value === null || value === undefined) {
        return null;
    }

    const n =
        Number(value);

    return Number.isFinite(n)
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
            businessId,
            items
        } = body;

        if (!businessId) {
            return Response.json(
                { error: "businessId es requerido" },
                { status: 400 }
            );
        }

        if (!Array.isArray(items) || !items.length) {
            return Response.json(
                { error: "No hay ítems para guardar" },
                { status: 400 }
            );
        }

        const [storeRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'store'
                LIMIT 1
                `,
                [businessId]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json(
                { error: "Tienda no encontrada" },
                { status: 404 }
            );
        }

        await conn.beginTransaction();

        for (const item of items) {
            const price =
                Math.max(
                    0,
                    toNumber(item.price, 0)
                );

            const salePrice =
                toNullableNumber(item.sale_price);

            const stockQty =
                Math.max(
                    0,
                    Math.round(
                        toNumber(item.stock_qty, 0)
                    )
                );

            const isVisible =
                Number(item.is_visible) === 1
                    ? 1
                    : 0;

            if (
                item.item_type === "variant" &&
                item.variant_id
            ) {
                await conn.query(
                    `
                    UPDATE tags_store_variants v
                    INNER JOIN tags_store_products p
                        ON p.id = v.product_id
                    SET
                        v.price = ?,
                        v.sale_price = ?,
                        v.stock_qty = ?,
                        v.is_visible = ?,
                        v.updated_at = NOW()
                    WHERE v.id = ?
                    AND p.store_id = ?
                    `,
                    [
                        price,
                        salePrice,
                        stockQty,
                        isVisible,
                        item.variant_id,
                        store.id
                    ]
                );

                continue;
            }

            if (
                item.item_type === "product" &&
                item.product_id
            ) {
                await conn.query(
                    `
                    UPDATE tags_store_products
                    SET
                        price = ?,
                        sale_price = ?,
                        stock_qty = ?,
                        is_visible = ?,
                        updated_at = NOW()
                    WHERE id = ?
                    AND store_id = ?
                    `,
                    [
                        price,
                        salePrice,
                        stockQty,
                        isVisible,
                        item.product_id,
                        store.id
                    ]
                );
            }
        }

        await conn.commit();

        return Response.json({
            ok: true,
            saved: items.length
        });

    } catch (err) {
        await conn.rollback();

        console.error(
            "STORE INVENTORY SAVE ERROR:",
            err
        );

        return Response.json(
            { error: "Error guardando inventario" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}
