// =====================================
// API: /api/store/admin/orders/shipping/simulate-status
// Descripción: Simula estados de envío en entorno local/desarrollo para probar el circuito logístico.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

const allowedStatuses = {
    ready: "Listo para despacho",
    shipped: "Despachado",
    in_transit: "En tránsito",
    delivered: "Entregado",
    returned: "Devuelto",
    cancelled: "Cancelado"
};

function parseJson(value, fallback = {}) {
    if (!value) {
        return fallback;
    }

    if (typeof value === "object") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

export async function POST(req) {
    try {
        if (process.env.NODE_ENV === "production") {
            return Response.json(
                { error: "Simulación no disponible en producción" },
                { status: 403 }
            );
        }

        const body =
            await req.json();

        const {
            businessId,
            orderId,
            shipping_status
        } = body;

        if (!businessId || !orderId) {
            return Response.json(
                { error: "businessId y orderId son requeridos" },
                { status: 400 }
            );
        }

        if (!allowedStatuses[shipping_status]) {
            return Response.json(
                { error: "Estado de envío inválido" },
                { status: 400 }
            );
        }

        const [rows] =
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
            rows[0];

        if (!order) {
            return Response.json(
                { error: "Pedido no encontrado" },
                { status: 404 }
            );
        }

        const metadata =
            parseJson(order.metadata_json, {});

        const shipmentId =
            metadata?.shipment?.shipment_id ||
            metadata?.zipnova_shipment_id ||
            null;

        const nextMetadata = {
            ...metadata,
            shipment: {
                ...(metadata.shipment || {}),
                shipment_id: shipmentId,
                status: shipping_status,
                status_name: allowedStatuses[shipping_status],
                simulated: true,
                simulated_at: new Date().toISOString()
            }
        };

        const payload = {
            provider: "zipnova",
            simulated: true,
            order_id: order.id,
            order_number: order.order_number,
            shipment_id: shipmentId,
            status: shipping_status,
            status_name: allowedStatuses[shipping_status],
            created_at: new Date().toISOString()
        };

        await db.query(
            `
            UPDATE tags_store_orders
            SET
                shipping_status = ?,
                metadata_json = ?,
                updated_at = NOW()
            WHERE id = ?
            LIMIT 1
            `,
            [
                shipping_status,
                JSON.stringify(nextMetadata),
                order.id
            ]
        );

        await db.query(
            `
            INSERT INTO tags_store_shipping_events (
                order_id,
                store_id,
                provider,
                shipment_id,
                event_type,
                status,
                status_name,
                payload_json,
                is_simulated,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
            `,
            [
                order.id,
                order.store_id,
                "zipnova",
                shipmentId,
                "simulated_status_change",
                shipping_status,
                allowedStatuses[shipping_status],
                JSON.stringify(payload)
            ]
        );

        return Response.json({
            ok: true,
            orderId: order.id,
            orderNumber: order.order_number,
            shipping_status,
            status_name: allowedStatuses[shipping_status],
            simulated: true
        });

    } catch (err) {
        console.error(
            "STORE SHIPPING SIMULATE STATUS ERROR:",
            err
        );

        return Response.json(
            { error: "Error simulando estado de envío" },
            { status: 500 }
        );
    }
}