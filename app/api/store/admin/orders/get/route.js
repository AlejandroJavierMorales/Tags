// =====================================
// API: /api/store/admin/orders/get
// Descripción: Obtiene un pedido de Tags Tienda con sus items.
// Uso: Dashboard Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function parseJson(value, fallback = {}) {
    if (!value) return fallback;
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

export async function GET(req) {
    try {
        const { searchParams } =
            new URL(req.url);

        const businessId =
            searchParams.get("businessId");

        const orderId =
            searchParams.get("orderId");

        if (!businessId || !orderId) {
            return Response.json(
                { error: "businessId y orderId son requeridos" },
                { status: 400 }
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT id, name, currency
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

        const [orderRows] =
            await db.query(
                `
                SELECT *
                FROM tags_store_orders
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
                `,
                [
                    orderId,
                    store.id
                ]
            );

        const order =
            orderRows[0];

        if (!order) {
            return Response.json(
                { error: "Pedido no encontrado" },
                { status: 404 }
            );
        }

        order.metadata_json =
            parseJson(order.metadata_json, {});

        const [items] =
            await db.query(
                `
                SELECT *
                FROM tags_store_order_items
                WHERE order_id = ?
                ORDER BY id ASC
                `,
                [order.id]
            );

        const normalizedItems =
            items.map(item => ({
                ...item,
                options_json:
                    parseJson(item.options_json, {})
            }));

        return Response.json({
            ok: true,
            store,
            order,
            items: normalizedItems
        });

    } catch (err) {
        console.error(
            "STORE ORDER GET ERROR:",
            err
        );

        return Response.json(
            { error: "Error obteniendo pedido" },
            { status: 500 }
        );
    }
}
