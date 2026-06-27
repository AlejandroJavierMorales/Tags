// =====================================
// API: /api/store/admin/orders/shipping/document
// Descripción: Descarga etiqueta o guía Zipnova y la devuelve como PDF/base64.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

import {
    downloadZipnovaShipmentDocument
}
    from "@/app/modules/store/lib/shipping/shipments/providers/ZipnovaShipmentProvider";

function parseJson(value, fallback = null) {
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

function buildBasicFilename(order, what, format) {
    return `${order.order_number}-${what}.${format}`;
}

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            businessId,
            orderId,
            what = "label",
            format = "pdf"
        } = body;

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

        const metadata =
            parseJson(order.metadata_json, {}) || {};

        const shipmentId =
            metadata?.shipment?.shipment_id ||
            metadata?.zipnova_shipment_id ||
            null;

        if (!shipmentId) {
            return Response.json(
                { error: "El pedido no tiene envío Zipnova generado" },
                { status: 400 }
            );
        }

        const [providerRows] =
            await db.query(
                `
                SELECT
                    account_id,
                    origin_id,
                    api_token,
                    api_secret
                FROM tags_store_shipping_provider_accounts
                WHERE store_id = ?
                AND provider = 'zipnova'
                AND is_active = 1
                AND is_connected = 1
                LIMIT 1
                `,
                [order.store_id]
            );

        const provider =
            providerRows[0];

        if (!provider) {
            return Response.json(
                { error: "Zipnova no está configurado para esta tienda" },
                { status: 400 }
            );
        }

        const doc =
            await downloadZipnovaShipmentDocument({
                provider,
                shipmentId,
                what,
                format,
                noStatusChange: true
            });

        const base64 =
            doc?.content ||
            doc?.base64 ||
            doc?.data ||
            doc?.document ||
            doc?.file ||
            null;

        if (!base64) {
            return Response.json(
                {
                    error: "Zipnova no devolvió el documento en base64",
                    details: doc
                },
                { status: 502 }
            );
        }

        const fileUrl =
            `data:application/pdf;base64,${base64}`;

        return Response.json({
            ok: true,
            shipmentId,
            filename:
                buildBasicFilename(
                    order,
                    what,
                    format
                ),
            mime:
                format === "pdf"
                    ? "application/pdf"
                    : "text/plain",
            base64,
            fileUrl
        });

    } catch (err) {
        if (err.status === 409) {
            return Response.json(
                {
                    error: "La etiqueta todavía no está disponible en Zipnova.",
                    details: err.details || null
                },
                { status: 409 }
            );
        }


        return Response.json(
            {
                error:
                    err.message ||
                    "Error descargando documento",
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