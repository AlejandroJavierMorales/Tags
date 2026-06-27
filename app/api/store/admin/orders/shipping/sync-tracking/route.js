// =====================================
// API: /api/store/admin/orders/shipping/sync-tracking
// Descripción: Sincroniza tracking de un pedido con Zipnova.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    ShipmentEngine
}
from "@/app/modules/store/lib/shipping/shipments/ShipmentEngine";

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            orderId,
            businessId
        } = body;

        if (!orderId) {
            return Response.json(
                { error: "orderId es requerido" },
                { status: 400 }
            );
        }

        const result =
            await ShipmentEngine.syncTracking({
                orderId,
                businessId
            });

        return Response.json(result);

    } catch (err) {
        console.error(
            "STORE SYNC TRACKING ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error sincronizando tracking",
                details:
                    err.details || null
            },
            {
                status:
                    err.status || 500
            }
        );
    }
}