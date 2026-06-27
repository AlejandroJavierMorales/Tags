// =====================================
// API: /api/store/webhooks/zipnova
// Descripción: Recibe webhooks reales de Zipnova, guarda payload crudo y procesa eventos logísticos.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import {
    ShippingEventProcessor
}
from "@/app/modules/store/lib/shipping/events/ShippingEventProcessor";

function normalizeZipnovaEvent(payload) {
    const rawStatus =
        payload?.status ||
        payload?.shipment?.status ||
        payload?.data?.status ||
        payload?.event ||
        payload?.type ||
        "";

    const value =
        String(rawStatus)
            .trim()
            .toLowerCase();

    const map = {
        new: "shipment_created",
        created: "shipment_created",
        processing: "shipment_created",
        ready: "ready",
        label_available: "label_available",
        picked_up: "picked_up",
        shipped: "shipped",
        dispatched: "shipped",
        in_transit: "in_transit",
        transit: "in_transit",
        delivery_attempt: "delivery_attempt",
        available_pickup: "available_pickup",
        delivered: "delivered",
        returned: "returned",
        cancelled: "cancelled",
        canceled: "cancelled"
    };

    return map[value] || value;
}

function getShipmentId(payload) {
    return payload?.id ||
        payload?.shipment_id ||
        payload?.shipment?.id ||
        payload?.data?.id ||
        null;
}

function getExternalId(payload) {
    return payload?.external_id ||
        payload?.shipment?.external_id ||
        payload?.data?.external_id ||
        payload?.order_number ||
        null;
}

function getTrackingCode(payload) {
    return payload?.carrier_tracking_id ||
        payload?.tracking_code ||
        payload?.shipment?.carrier_tracking_id ||
        payload?.data?.carrier_tracking_id ||
        null;
}

function getTrackingUrl(payload) {
    return payload?.tracking_external ||
        payload?.tracking ||
        payload?.tracking_url ||
        payload?.shipment?.tracking_external ||
        payload?.shipment?.tracking ||
        payload?.data?.tracking_external ||
        payload?.data?.tracking ||
        null;
}

function getCarrierId(payload) {
    return payload?.carrier?.id ||
        payload?.shipment?.carrier?.id ||
        payload?.data?.carrier?.id ||
        null;
}

function getCarrierName(payload) {
    return payload?.carrier?.name ||
        payload?.shipment?.carrier?.name ||
        payload?.data?.carrier?.name ||
        null;
}

async function findStoreAndOrder({
    shipmentId,
    externalId
}) {
    if (!shipmentId && !externalId) {
        return {
            storeId: null,
            orderId: null
        };
    }

    const params = [];

    let where = "";

    if (shipmentId) {
        where = `
            (
                JSON_UNQUOTE(JSON_EXTRACT(o.metadata_json, '$.shipment.shipment_id')) = ?
                OR JSON_UNQUOTE(JSON_EXTRACT(o.metadata_json, '$.zipnova_shipment_id')) = ?
            )
        `;

        params.push(
            String(shipmentId),
            String(shipmentId)
        );
    }

    if (externalId) {
        if (where) {
            where = `(${where}) OR o.order_number = ?`;
        } else {
            where = `o.order_number = ?`;
        }

        params.push(
            String(externalId)
        );
    }

    const [rows] =
        await db.query(
            `
            SELECT
                o.id AS order_id,
                o.store_id
            FROM tags_store_orders o
            WHERE ${where}
            LIMIT 1
            `,
            params
        );

    return {
        storeId:
            rows[0]?.store_id || null,
        orderId:
            rows[0]?.order_id || null
    };
}

async function insertWebhookLog({
    storeId,
    orderId,
    provider,
    shipmentId,
    externalId,
    eventType,
    payload
}) {
    const [result] =
        await db.query(
            `
            INSERT INTO tags_store_shipping_webhooks (
                store_id,
                order_id,
                provider,
                shipment_id,
                external_id,
                event_type,
                payload_json,
                status,
                received_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'received', NOW())
            `,
            [
                storeId || 0,
                orderId || null,
                provider,
                shipmentId ? String(shipmentId) : null,
                externalId ? String(externalId) : null,
                eventType || null,
                JSON.stringify(payload || {})
            ]
        );

    return result.insertId;
}

async function updateWebhookLog({
    webhookId,
    status,
    processedJson = null,
    errorMessage = null,
    processingTimeMs = null,
    orderId = null,
    storeId = null
}) {
    await db.query(
        `
        UPDATE tags_store_shipping_webhooks
        SET
            status = ?,
            processed_json = ?,
            error_message = ?,
            processing_time_ms = ?,
            order_id = COALESCE(?, order_id),
            store_id = COALESCE(NULLIF(?, 0), store_id),
            processed_at = NOW()
        WHERE id = ?
        LIMIT 1
        `,
        [
            status,
            processedJson
                ? JSON.stringify(processedJson)
                : null,
            errorMessage,
            processingTimeMs,
            orderId,
            storeId || 0,
            webhookId
        ]
    );
}

export async function POST(req) {
    const startedAt =
        Date.now();

    let webhookId =
        null;

    try {
        const secret =
            process.env.ZIPNOVA_WEBHOOK_SECRET;

        if (secret) {
            const received =
                req.headers.get("x-zipnova-secret") ||
                req.headers.get("x-webhook-secret") ||
                req.headers.get("authorization") ||
                "";

            if (!received.includes(secret)) {
                return Response.json(
                    { error: "Webhook no autorizado" },
                    { status: 401 }
                );
            }
        }

        const payload =
            await req.json();

        const event =
            normalizeZipnovaEvent(payload);

        const shipmentId =
            getShipmentId(payload);

        const externalId =
            getExternalId(payload);

        const located =
            await findStoreAndOrder({
                shipmentId,
                externalId
            });

        webhookId =
            await insertWebhookLog({
                storeId:
                    located.storeId,
                orderId:
                    located.orderId,
                provider:
                    "zipnova",
                shipmentId,
                externalId,
                eventType:
                    event,
                payload
            });

        const result =
            await ShippingEventProcessor.process({
                provider:
                    "zipnova",
                event,
                shipmentId,
                externalId,
                trackingCode:
                    getTrackingCode(payload),
                trackingUrl:
                    getTrackingUrl(payload),
                carrierId:
                    getCarrierId(payload),
                carrierName:
                    getCarrierName(payload),
                labelUrl:
                    payload?.label_url ||
                    payload?.shipping_label_url ||
                    payload?.data?.label_url ||
                    null,
                payload,
                isSimulated:
                    false,
                sendNotifications:
                    true
            });

        await updateWebhookLog({
            webhookId,
            status:
                result?.duplicate
                    ? "ignored"
                    : "processed",
            processedJson:
                result,
            processingTimeMs:
                Date.now() - startedAt,
            orderId:
                result?.orderId || located.orderId,
            storeId:
                located.storeId
        });

        return Response.json(result);

    } catch (err) {
        console.error(
            "ZIPNOVA WEBHOOK ERROR:",
            err
        );

        if (webhookId) {
            await updateWebhookLog({
                webhookId,
                status:
                    "error",
                errorMessage:
                    err.message || "Error procesando webhook Zipnova",
                processedJson: {
                    error:
                        err.message,
                    details:
                        err.details || null
                },
                processingTimeMs:
                    Date.now() - startedAt
            });
        }

        return Response.json(
            {
                error:
                    err.message ||
                    "Error procesando webhook Zipnova",
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