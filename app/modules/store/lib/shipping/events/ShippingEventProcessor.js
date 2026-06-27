// =====================================
// File: app/modules/store/lib/shipping/events/ShippingEventProcessor.js
// Descripción: Procesa eventos logísticos reales o simulados y dispara cambios de pedido, stock, emails y auditoría.
// =====================================

import { db }
    from "@/app/lib/tags-db";

import { sendStoreOrderEmail }
    from "@/app/modules/store/lib/sendStoreOrderEmail";

const statusMap = {
    shipment_created: {
        shipping_status: "ready",
        status_name: "Envío generado"
    },
    label_available: {
        shipping_status: "ready",
        status_name: "Etiqueta disponible"
    },
    ready: {
        shipping_status: "ready",
        status_name: "Listo para despacho"
    },
    picked_up: {
        shipping_status: "shipped",
        status_name: "Retirado por transportista"
    },
    shipped: {
        shipping_status: "shipped",
        status_name: "Despachado"
    },
    in_transit: {
        shipping_status: "in_transit",
        status_name: "En tránsito"
    },
    delivery_attempt: {
        shipping_status: "in_transit",
        status_name: "Intento de entrega"
    },
    available_pickup: {
        shipping_status: "in_transit",
        status_name: "Disponible para retiro"
    },
    delivered: {
        shipping_status: "delivered",
        status_name: "Entregado"
    },
    returned: {
        shipping_status: "returned",
        status_name: "Devuelto"
    },
    cancelled: {
        shipping_status: "cancelled",
        status_name: "Cancelado"
    }
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

function stringifyJson(value) {
    return JSON.stringify(value || {});
}

function normalizeEvent(event) {
    return String(event || "")
        .trim()
        .toLowerCase();
}

async function getOrderWithStore(conn, {
    orderId,
    businessId,
    shipmentId,
    externalId
}) {
    const params = [];

    let where = "";

    if (orderId) {
        where = "o.id = ?";
        params.push(orderId);
    } else if (shipmentId) {
        where = `
            (
                JSON_UNQUOTE(JSON_EXTRACT(o.metadata_json, '$.shipment.shipment_id')) = ?
                OR JSON_UNQUOTE(JSON_EXTRACT(o.metadata_json, '$.zipnova_shipment_id')) = ?
            )
        `;
        params.push(String(shipmentId), String(shipmentId));
    } else if (externalId) {
        where = "o.order_number = ?";
        params.push(String(externalId));
    } else {
        throw new Error("No hay identificador suficiente para ubicar el pedido");
    }

    let businessSql = "";

    if (businessId) {
        businessSql = "AND s.business_id = ?";
        params.push(businessId);
    }

    const [rows] =
        await conn.query(
            `
            SELECT
                o.*,
                s.business_id,
                s.logo_url,
                s.styles_json,
                s.name AS store_name,
                s.currency,
                s.slug,
                s.whatsapp,
                s.email AS store_email
            FROM tags_store_orders o
            INNER JOIN tags_stores s
                ON s.id = o.store_id
            WHERE ${where}
            ${businessSql}
            LIMIT 1
            `,
            params
        );

    return rows[0] || null;
}

async function getOrderItems(conn, orderId) {
    const [rows] =
        await conn.query(
            `
            SELECT *
            FROM tags_store_order_items
            WHERE order_id = ?
            ORDER BY id ASC
            `,
            [orderId]
        );

    return rows;
}

async function resolveLocalCarrier(conn, {
    storeId,
    provider,
    externalCarrierId,
    carrierName
}) {
    if (!carrierName) {
        return null;
    }

    const code =
        `${provider}_${externalCarrierId || carrierName}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");

    const [rows] =
        await conn.query(
            `
            SELECT id, name
            FROM tags_store_carriers
            WHERE store_id = ?
            AND (
                code = ?
                OR name = ?
            )
            LIMIT 1
            `,
            [
                storeId,
                code,
                carrierName
            ]
        );

    if (rows[0]) {
        return rows[0];
    }

    const [result] =
        await conn.query(
            `
            INSERT INTO tags_store_carriers (
                store_id,
                name,
                code,
                type,
                api_provider,
                is_active,
                sort_order,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, 'api', ?, 1, 100, NOW(), NOW())
            `,
            [
                storeId,
                carrierName,
                code,
                provider
            ]
        );

    return {
        id: result.insertId,
        name: carrierName
    };
}

async function discountReservedStockIfNeeded(conn, order, metadata) {
    if (Number(order.stock_reserved) !== 1) {
        return {
            changed: false,
            reason: "Sin reserva activa"
        };
    }

    if (metadata?.stock_confirmed_at) {
        return {
            changed: false,
            reason: "Stock ya confirmado"
        };
    }

    const items =
        await getOrderItems(conn, order.id);

    for (const item of items) {
        const quantity =
            Number(item.quantity || 1);

        if (item.variant_id) {
            await conn.query(
                `
                UPDATE tags_store_variants
                SET stock_qty = stock_qty - ?
                WHERE id = ?
                LIMIT 1
                `,
                [
                    quantity,
                    item.variant_id
                ]
            );
        } else {
            await conn.query(
                `
                UPDATE tags_store_products
                SET stock_qty = stock_qty - ?
                WHERE id = ?
                AND stock_enabled = 1
                LIMIT 1
                `,
                [
                    quantity,
                    item.product_id
                ]
            );
        }
    }

    return {
        changed: true,
        metadata: {
            ...metadata,
            stock_confirmed_at:
                new Date().toISOString(),
            stock_confirmed_by:
                "shipping_event_processor"
        }
    };
}

async function returnStockIfNeeded(conn, order, metadata) {
    if (metadata?.stock_returned_at) {
        return {
            changed: false,
            reason: "Stock ya devuelto"
        };
    }

    if (Number(order.stock_reserved) === 1) {
        return {
            changed: true,
            releaseOnly: true,
            metadata: {
                ...metadata,
                stock_reservation_released_at:
                    new Date().toISOString(),
                stock_reservation_released_by:
                    "shipping_event_processor"
            }
        };
    }

    const shouldReturnRealStock =
        order.payment_status === "paid" ||
        ["confirmed", "preparing", "shipped", "completed"].includes(order.order_status);

    if (!shouldReturnRealStock) {
        return {
            changed: false,
            reason: "No corresponde devolver stock real"
        };
    }

    const items =
        await getOrderItems(conn, order.id);

    for (const item of items) {
        const quantity =
            Number(item.quantity || 1);

        if (item.variant_id) {
            await conn.query(
                `
                UPDATE tags_store_variants
                SET stock_qty = stock_qty + ?
                WHERE id = ?
                LIMIT 1
                `,
                [
                    quantity,
                    item.variant_id
                ]
            );
        } else {
            await conn.query(
                `
                UPDATE tags_store_products
                SET stock_qty = stock_qty + ?
                WHERE id = ?
                AND stock_enabled = 1
                LIMIT 1
                `,
                [
                    quantity,
                    item.product_id
                ]
            );
        }
    }

    return {
        changed: true,
        metadata: {
            ...metadata,
            stock_returned_at:
                new Date().toISOString(),
            stock_returned_by:
                "shipping_event_processor"
        }
    };
}

async function sendShippingEmailIfNeeded(conn, order, store, items, event) {
    const emailByEvent = {
        shipped: {
            type: "order_shipped",
            flag: "email_order_shipped_sent"
        },
        delivered: {
            type: "order_delivered",
            flag: "email_order_delivered_sent"
        },
        cancelled: {
            type: "order_cancelled",
            flag: "email_order_cancelled_sent"
        }
    };

    const config =
        emailByEvent[event];

    if (!config) {
        return false;
    }

    if (!order.customer_email) {
        return false;
    }

    const metadata =
        parseJson(order.metadata_json, {});

    const emailFlags =
        metadata.email_flags || {};

    if (emailFlags[config.flag]) {
        return false;
    }

    await sendStoreOrderEmail({
        store,
        order,
        items,
        type: config.type
    });

    await conn.query(
        `
        UPDATE tags_store_orders
        SET
            metadata_json = JSON_SET(
                COALESCE(metadata_json, JSON_OBJECT()),
                ?,
                1
            )
        WHERE id = ?
        LIMIT 1
        `,
        [
            `$.email_flags.${config.flag}`,
            order.id
        ]
    );

    return true;
}

function buildNextOrderStatus(event, order) {
    if (event === "delivered") {
        return "completed";
    }

    if (event === "cancelled") {
        return order.order_status === "completed"
            ? "completed"
            : "cancelled";
    }

    if (
        event === "shipped" ||
        event === "picked_up" ||
        event === "in_transit" ||
        event === "delivery_attempt" ||
        event === "available_pickup"
    ) {
        return order.order_status === "completed"
            ? "completed"
            : "shipped";
    }

    if (
        event === "shipment_created" ||
        event === "label_available" ||
        event === "ready"
    ) {
        return ["shipped", "completed"].includes(order.order_status)
            ? order.order_status
            : "confirmed";
    }

    return order.order_status;
}

function buildNextShippingStatus(event, order) {
    if (order.shipping_status === "delivered") {
        return "delivered";
    }

    if (order.shipping_status === "cancelled") {
        return event === "delivered"
            ? "delivered"
            : "cancelled";
    }

    if (event === "delivered") {
        return "delivered";
    }

    if (event === "cancelled") {
        return "cancelled";
    }

    if (
        event === "shipped" ||
        event === "picked_up"
    ) {
        return "shipped";
    }

    if (
        event === "in_transit" ||
        event === "delivery_attempt" ||
        event === "available_pickup"
    ) {
        return "in_transit";
    }

    if (
        event === "shipment_created" ||
        event === "label_available" ||
        event === "ready"
    ) {
        return ["shipped", "in_transit", "delivered"].includes(order.shipping_status)
            ? order.shipping_status
            : "ready";
    }

    return order.shipping_status;
}

async function hasEventAlreadyProcessed(conn, {
    orderId,
    provider,
    shipmentId,
    event
}) {
    const [rows] =
        await conn.query(
            `
            SELECT id
            FROM tags_store_shipping_events
            WHERE order_id = ?
            AND provider = ?
            AND shipment_id = ?
            AND event_type = ?
            AND JSON_EXTRACT(payload_json, '$.duplicate') IS NULL
            LIMIT 1
            `,
            [
                orderId,
                provider,
                String(shipmentId || ""),
                event
            ]
        );

    return Boolean(rows[0]);
}

async function insertShippingEvent(conn, {
    order,
    provider,
    shipmentId,
    event,
    shippingStatus,
    statusName,
    payload,
    isSimulated
}) {
    await conn.query(
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
            order.id,
            order.store_id,
            provider,
            String(shipmentId || ""),
            event,
            shippingStatus,
            statusName,
            stringifyJson(payload),
            isSimulated ? 1 : 0
        ]
    );
}

function shouldIgnoreSideEffects(event, order) {
    if (
        order.order_status === "completed" ||
        order.shipping_status === "delivered"
    ) {
        return event !== "delivered";
    }

    return false;
}

export const ShippingEventProcessor = {

    async process({
        provider = "zipnova",
        event,
        orderId = null,
        businessId = null,
        shipmentId = null,
        externalId = null,
        trackingCode = null,
        trackingUrl = null,
        carrierId = null,
        carrierName = null,
        labelUrl = null,
        payload = {},
        isSimulated = false,
        sendNotifications = true
    }) {
        const cleanEvent =
            normalizeEvent(event);

        const eventConfig =
            statusMap[cleanEvent];

        if (!eventConfig) {
            throw new Error(`Evento logístico inválido: ${event}`);
        }

        const conn =
            await db.getConnection();

        try {
            await conn.beginTransaction();

            const order =
                await getOrderWithStore(conn, {
                    orderId,
                    businessId,
                    shipmentId,
                    externalId
                });

            if (!order) {
                throw new Error("Pedido no encontrado para el evento logístico");
            }

            const items =
                await getOrderItems(conn, order.id);

            const store = {
                id:
                    order.store_id,
                business_id:
                    order.business_id,
                name:
                    order.store_name,
                currency:
                    order.currency,
                slug:
                    order.slug,
                whatsapp:
                    order.whatsapp,
                email:
                    order.store_email,
                logo_url:
                    order.logo_url,
                styles_json:
                    parseJson(order.styles_json, {})
            };

            let metadata =
                parseJson(order.metadata_json, {});

            const nextOrderStatus =
                buildNextOrderStatus(
                    cleanEvent,
                    order
                );

            const nextShippingStatus =
                buildNextShippingStatus(
                    cleanEvent,
                    order
                );

            const ignoreSideEffects =
                shouldIgnoreSideEffects(
                    cleanEvent,
                    order
                );

            const externalCarrierId =
                carrierId ||
                metadata?.shipment?.external_carrier_id ||
                metadata?.shipment?.carrier_id ||
                null;

            const displayCarrierName =
                carrierName ||
                order.carrier_name ||
                metadata?.shipment?.carrier_name ||
                metadata?.shipment?.external_carrier_name ||
                null;

            const localCarrier =
                await resolveLocalCarrier(conn, {
                    storeId:
                        order.store_id,
                    provider,
                    externalCarrierId,
                    carrierName:
                        displayCarrierName
                });

            const nextShipment = {
                ...(metadata.shipment || {}),

                shipment_id:
                    shipmentId ||
                    metadata?.shipment?.shipment_id ||
                    metadata?.zipnova_shipment_id ||
                    null,

                status:
                    cleanEvent,

                status_name:
                    eventConfig.status_name,

                tracking_code:
                    trackingCode ||
                    order.tracking_code ||
                    metadata?.shipment?.tracking_code ||
                    null,

                tracking_url:
                    trackingUrl ||
                    order.tracking_url ||
                    metadata?.shipment?.tracking_url ||
                    null,

                carrier_id:
                    localCarrier?.id ||
                    (
                        Number(order.carrier_id) === Number(externalCarrierId)
                            ? null
                            : order.carrier_id
                    ) ||
                    null,

                carrier_name:
                    localCarrier?.name ||
                    displayCarrierName ||
                    null,

                external_carrier_id:
                    externalCarrierId,

                external_carrier_name:
                    displayCarrierName,

                label_url:
                    labelUrl ||
                    order.shipping_label_url ||
                    metadata?.shipment?.label_url ||
                    null,

                last_event:
                    cleanEvent,

                last_event_at:
                    new Date().toISOString(),

                simulated:
                    Boolean(isSimulated)
            };

            const alreadyProcessed =
                await hasEventAlreadyProcessed(conn, {
                    orderId:
                        order.id,
                    provider,
                    shipmentId:
                        nextShipment.shipment_id,
                    event:
                        cleanEvent
                });

            if (alreadyProcessed) {
                await insertShippingEvent(conn, {
                    order,
                    provider,
                    shipmentId:
                        nextShipment.shipment_id,
                    event:
                        cleanEvent,
                    shippingStatus:
                        nextShippingStatus,
                    statusName:
                        eventConfig.status_name,
                    payload: {
                        ...payload,
                        normalized_event:
                            cleanEvent,
                        duplicate:
                            true,
                        ignored_side_effects:
                            true
                    },
                    isSimulated
                });

                await conn.commit();

                return {
                    ok: true,
                    duplicate: true,
                    ignored_side_effects: true,
                    orderId:
                        order.id,
                    orderNumber:
                        order.order_number,
                    event:
                        cleanEvent,
                    shipping_status:
                        order.shipping_status,
                    order_status:
                        order.order_status,
                    stock_reserved:
                        order.stock_reserved,
                    notification_sent:
                        false,
                    simulated:
                        Boolean(isSimulated)
                };
            }

            let stockResult = {
                changed: false
            };

            if (!ignoreSideEffects && cleanEvent === "delivered") {
                stockResult =
                    await discountReservedStockIfNeeded(
                        conn,
                        order,
                        metadata
                    );

                if (stockResult.metadata) {
                    metadata =
                        stockResult.metadata;
                }
            }

            if (
                !ignoreSideEffects &&
                ["cancelled", "returned"].includes(cleanEvent)
            ) {
                stockResult =
                    await returnStockIfNeeded(
                        conn,
                        order,
                        metadata
                    );

                if (stockResult.metadata) {
                    metadata =
                        stockResult.metadata;
                }
            }

            metadata = {
                ...metadata,
                shipment:
                    nextShipment,
                shipping_last_event:
                    cleanEvent,
                shipping_last_event_at:
                    new Date().toISOString()
            };

            if (cleanEvent === "delivered") {
                metadata.review_trigger = {
                    source:
                        "shipping_event_processor",
                    pending:
                        true,
                    order_id:
                        order.id,
                    generated_at:
                        new Date().toISOString()
                };
            }

            const nextStockReserved =
                ["delivered", "cancelled", "returned"].includes(cleanEvent)
                    ? 0
                    : order.stock_reserved;

            await conn.query(
                `
                UPDATE tags_store_orders
                SET
                    shipping_status = ?,
                    order_status = ?,
                    stock_reserved = ?,
                    tracking_code = ?,
                    tracking_url = ?,
                    carrier_id = ?,
                    carrier_name = ?,
                    shipping_label_url = ?,
                    metadata_json = ?,
                    updated_at = NOW()
                WHERE id = ?
                LIMIT 1
                `,
                [
                    nextShippingStatus,
                    nextOrderStatus,
                    nextStockReserved,
                    nextShipment.tracking_code,
                    nextShipment.tracking_url,
                    nextShipment.carrier_id,
                    nextShipment.carrier_name,
                    nextShipment.label_url,
                    stringifyJson(metadata),
                    order.id
                ]
            );

            await insertShippingEvent(conn, {
                order,
                provider,
                shipmentId:
                    nextShipment.shipment_id,
                event:
                    cleanEvent,
                shippingStatus:
                    nextShippingStatus,
                statusName:
                    eventConfig.status_name,
                payload: {
                    ...payload,
                    normalized_event:
                        cleanEvent,
                    stock_result:
                        stockResult
                },
                isSimulated
            });

            let notificationSent =
                false;

            if (sendNotifications && !ignoreSideEffects) {
                notificationSent =
                    await sendShippingEmailIfNeeded(
                        conn,
                        {
                            ...order,
                            shipping_status:
                                nextShippingStatus,
                            order_status:
                                nextOrderStatus,
                            tracking_code:
                                nextShipment.tracking_code,
                            tracking_url:
                                nextShipment.tracking_url,
                            carrier_name:
                                nextShipment.carrier_name,
                            metadata_json:
                                stringifyJson(metadata)
                        },
                        store,
                        items,
                        cleanEvent
                    );
            }

            await conn.commit();

            return {
                ok: true,
                orderId:
                    order.id,
                orderNumber:
                    order.order_number,
                event:
                    cleanEvent,
                shipping_status:
                    nextShippingStatus,
                status_name:
                    eventConfig.status_name,
                order_status:
                    nextOrderStatus,
                stock_reserved:
                    nextStockReserved,
                stock_result:
                    stockResult,
                notification_sent:
                    Boolean(notificationSent),
                simulated:
                    Boolean(isSimulated),
                ignored_side_effects:
                    Boolean(ignoreSideEffects),
            };

        } catch (err) {
            await conn.rollback();
            throw err;

        } finally {
            conn.release();
        }
    }
};