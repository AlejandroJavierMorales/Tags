// =====================================
// API: /api/store/admin/orders/shipping/simulate-event
// Descripción: Simula eventos logísticos completos usando el mismo procesador que los webhooks reales.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    ShippingEventProcessor
}
from "@/app/modules/store/lib/shipping/events/ShippingEventProcessor";

const allowedEvents = [
    "shipment_created",
    "label_available",
    "ready",
    "picked_up",
    "shipped",
    "in_transit",
    "delivery_attempt",
    "available_pickup",
    "delivered",
    "returned",
    "cancelled"
];

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
            event,
            sendNotifications = true
        } = body;

        if (!businessId || !orderId) {
            return Response.json(
                { error: "businessId y orderId son requeridos" },
                { status: 400 }
            );
        }

        if (!allowedEvents.includes(event)) {
            return Response.json(
                { error: "Evento inválido" },
                { status: 400 }
            );
        }

        const result =
            await ShippingEventProcessor.process({
                provider: "zipnova",
                event,
                orderId,
                businessId,
                payload: {
                    source: "admin_simulator",
                    body
                },
                isSimulated: true,
                sendNotifications
            });

        return Response.json(result);

    } catch (err) {
        console.error(
            "STORE SHIPPING SIMULATE EVENT ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error simulando evento logístico"
            },
            {
                status: 500
            }
        );
    }
}