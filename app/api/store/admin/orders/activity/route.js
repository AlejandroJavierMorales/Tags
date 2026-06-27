// =====================================
// API: /api/store/admin/orders/activity
// Descripción: Devuelve el historial unificado de actividad de un pedido.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

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

        const [orderRows] =
            await db.query(
                `
                SELECT
                    o.*,
                    s.business_id
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

        const activity = [];

        activity.push({
            type: "order",
            source: "Tienda",
            event: "Pedido creado",
            status: order.order_status,
            detail: `Pedido ${order.order_number}`,
            created_at: order.created_at
        });

        if (order.payment_status === "paid") {
            activity.push({
                type: "payment",
                source: "Pago",
                event: "Pago confirmado",
                status: "paid",
                detail: order.payment_method,
                created_at: order.updated_at
            });
        }

        const [shippingEvents] =
            await db.query(
                `
                SELECT
                    id,
                    provider,
                    event_type,
                    status,
                    status_name,
                    payload_json,
                    is_simulated,
                    created_at
                FROM tags_store_shipping_events
                WHERE order_id = ?
                ORDER BY created_at ASC, id ASC
                `,
                [order.id]
            );

        for (const ev of shippingEvents) {
            activity.push({
                type: "shipping_event",
                source: ev.is_simulated ? "Simulación" : ev.provider,
                event: ev.event_type,
                status: ev.status,
                detail: ev.status_name,
                created_at: ev.created_at
            });
        }

        const [webhooks] =
            await db.query(
                `
                SELECT
                    id,
                    provider,
                    event_type,
                    status,
                    error_message,
                    processing_time_ms,
                    received_at,
                    processed_at
                FROM tags_store_shipping_webhooks
                WHERE order_id = ?
                ORDER BY received_at ASC, id ASC
                `,
                [order.id]
            );

        for (const wh of webhooks) {
            activity.push({
                type: "webhook",
                source: `Webhook ${wh.provider}`,
                event: wh.event_type,
                status: wh.status,
                detail: wh.error_message || `Procesado en ${wh.processing_time_ms || 0} ms`,
                created_at: wh.received_at
            });
        }

        const metadata =
            typeof order.metadata_json === "object"
                ? order.metadata_json
                : JSON.parse(order.metadata_json || "{}");

        if (metadata.stock_confirmed_at) {
            activity.push({
                type: "stock",
                source: "Stock",
                event: "Stock confirmado",
                status: "ok",
                detail: "Stock descontado definitivamente",
                created_at: metadata.stock_confirmed_at
            });
        }

        if (metadata.stock_reservation_released_at) {
            activity.push({
                type: "stock",
                source: "Stock",
                event: "Reserva liberada",
                status: "ok",
                detail: "Stock reservado liberado",
                created_at: metadata.stock_reservation_released_at
            });
        }

        if (metadata.review_trigger?.generated_at) {
            activity.push({
                type: "review",
                source: "Reviews",
                event: "Review programada",
                status: "pending",
                detail: "Pendiente de envío/revisión",
                created_at: metadata.review_trigger.generated_at
            });
        }

        activity.sort(
            (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
        );

        return Response.json({
            ok: true,
            orderId: order.id,
            orderNumber: order.order_number,
            activity
        });

    } catch (err) {
        console.error("STORE ORDER ACTIVITY ERROR:", err);

        return Response.json(
            {
                error:
                    err.message ||
                    "Error obteniendo actividad del pedido"
            },
            { status: 500 }
        );
    }
}