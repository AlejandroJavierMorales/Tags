// =====================================
// API: /api/store/admin/orders/resend-email
// Descripción: Reenvía emails transaccionales de un pedido.
// Uso: Admin Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import {
    sendStoreOrderEmail
}
from "@/app/modules/store/lib/sendStoreOrderEmail";

const validTypes = [
    "order_created",
    "payment_paid",
    "order_shipped"
];

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            businessId,
            orderId,
            type
        } = body;

        if (!businessId || !orderId || !type) {
            return Response.json(
                { error: "businessId, orderId y type son requeridos" },
                { status: 400 }
            );
        }

        if (!validTypes.includes(type)) {
            return Response.json(
                { error: "Tipo de email inválido" },
                { status: 400 }
            );
        }

        const [orderRows] =
            await db.query(
                `
                SELECT
                    o.*,
                    s.name AS store_name,
                    s.slug,
                    s.logo_url
                FROM tags_store_orders o

                INNER JOIN tags_stores s
                    ON s.id = o.store_id

                WHERE o.id = ?
                AND s.business_id = ?
                LIMIT 1
                `,
                [
                    orderId,
                    businessId
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

        if (!order.customer_email) {
            return Response.json(
                { error: "El pedido no tiene email de cliente" },
                { status: 400 }
            );
        }

        const [items] =
            await db.query(
                `
                SELECT *
                FROM tags_store_order_items
                WHERE order_id = ?
                ORDER BY id ASC
                `,
                [
                    order.id
                ]
            );

        await sendStoreOrderEmail({
            store: {
                name:
                    order.store_name,
                slug:
                    order.slug,
                logo_url:
                    order.logo_url
            },
            order,
            items,
            type
        });

        return Response.json({
            ok: true
        });

    } catch (err) {
        console.error(
            "STORE RESEND EMAIL ERROR:",
            err
        );

        return Response.json(
            { error: "Error reenviando email" },
            { status: 500 }
        );
    }
}