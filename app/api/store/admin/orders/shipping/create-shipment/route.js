// =====================================
// File: app/api/store/admin/orders/shipping/create-shipment/route.js
// Descripción: API admin para crear un envío real en el proveedor logístico desde un pedido.
// =====================================

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

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

        if (!orderId || !businessId) {
            return Response.json(
                {
                    error:
                        "businessId y orderId son requeridos"
                },
                {
                    status: 400
                }
            );
        }

        const result =
            await ShipmentEngine.create({
                orderId,
                businessId
            });

        return Response.json(
            result
        );

    } catch (err) {
        console.error(
            "STORE CREATE SHIPMENT ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error creando envío",

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
