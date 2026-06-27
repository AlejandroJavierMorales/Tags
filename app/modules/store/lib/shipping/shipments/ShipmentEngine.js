// =====================================
// File: app/modules/store/lib/shipping/shipments/ShipmentEngine.js
// Descripción: Motor de envíos para crear despachos desacoplando Tags Tienda de proveedores logísticos.
// =====================================

import { db }
    from "@/app/lib/tags-db";

import {
    createZipnovaShipment,
    getZipnovaShipment
}
    from "./providers/ZipnovaShipmentProvider";

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

function stringifyJson(value) {
    return JSON.stringify(
        value || {}
    );
}

async function getOrder(orderId, businessId) {
    const params =
        [orderId];

    let businessSql =
        "";

    if (businessId) {
        businessSql =
            "AND s.business_id = ?";

        params.push(businessId);
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
            ${businessSql}
            LIMIT 1
            `,
            params
        );

    return rows[0] || null;
}

async function getOrderItems(orderId) {
    const [rows] =
        await db.query(
            `
            SELECT
                oi.*,

                p.sku AS product_sku,
                p.weight_grams,
                p.package_width_cm,
                p.package_height_cm,
                p.package_length_cm,
                p.requires_shipping,

                v.sku AS variant_sku

            FROM tags_store_order_items oi

            LEFT JOIN tags_store_products p
                ON p.id = oi.product_id

            LEFT JOIN tags_store_variants v
                ON v.id = oi.variant_id

            WHERE oi.order_id = ?

            ORDER BY oi.id ASC
            `,
            [
                orderId
            ]
        );

    return rows
        .filter(item =>
            Number(item.requires_shipping) !== 0
        )
        .map(item => ({
            ...item,

            product_sku:
                item.product_sku ||
                item.sku ||
                String(item.product_id || item.id),

            variant_sku:
                item.variant_sku ||
                item.sku ||
                null,

            weight:
                item.weight_grams,

            width:
                item.package_width_cm,

            height:
                item.package_height_cm,

            length:
                item.package_length_cm
        }));
}

async function getProvider(storeId, providerCode) {
    const [rows] =
        await db.query(
            `
            SELECT
                id,
                store_id,
                provider,
                name,
                auth_type,
                account_id,
                origin_id,
                api_token,
                api_secret,
                is_active,
                is_connected,
                settings_json
            FROM tags_store_shipping_provider_accounts
            WHERE store_id = ?
            AND provider = ?
            AND is_active = 1
            AND is_connected = 1
            LIMIT 1
            `,
            [
                storeId,
                providerCode
            ]
        );

    return rows[0] || null;
}

function getProviderFromOrder(order) {
    const quote =
        parseJson(
            order.shipping_quote_json,
            {}
        );

    const selected =
        quote.selectedQuote ||
        quote.selected_quote ||
        quote.quote ||
        quote;

    return selected.provider ||
        quote.provider ||
        "zipnova";
}

async function saveShipmentResult({
    order,
    providerCode,
    result
}) {
    const currentQuote =
        parseJson(
            order.shipping_quote_json,
            {}
        );

    const currentMetadata =
        parseJson(
            order.metadata_json,
            {}
        );

    const shipment =
        result.shipment;

    const nextQuoteJson = {
        ...currentQuote,
        shipment_provider:
            providerCode,
        zipnova_request:
            result.request,
        zipnova_shipment:
            shipment.raw
    };

    const nextMetadataJson = {
        ...currentMetadata,
        zipnova_shipment_id:
            shipment.shipment_id,
        zipnova_delivery_id:
            shipment.delivery_id
    };

    await db.query(
        `
        UPDATE tags_store_orders
        SET
            carrier_id = ?,
            carrier_name = ?,
            tracking_code = ?,
            tracking_url = ?,
            shipping_label_url = ?,
            shipping_status = ?,
            shipping_quote_json = ?,
            metadata_json = ?,
            updated_at = NOW()
        WHERE id = ?
        LIMIT 1
        `,
        [
            shipment.carrier_id ||
            order.carrier_id ||
            null,

            shipment.carrier_name ||
            order.carrier_name ||
            null,

            shipment.carrier_tracking_id ||
            shipment.delivery_id ||
            order.tracking_code ||
            null,

            shipment.tracking_url ||
            order.tracking_url ||
            null,

            shipment.label_url ||
            order.shipping_label_url ||
            null,

            "ready",

            stringifyJson(nextQuoteJson),

            stringifyJson(nextMetadataJson),

            order.id
        ]
    );
}

export const ShipmentEngine = {

    async create({
        orderId,
        businessId = null
    }) {
        if (!orderId) {
            throw new Error(
                "orderId es requerido"
            );
        }

        const order =
            await getOrder(orderId, businessId);

        if (!order) {
            throw new Error(
                "Pedido no encontrado"
            );
        }

        const metadata =
            parseJson(order.metadata_json, {}) || {};

        const shipmentAlreadyCreated =
            Boolean(
                metadata?.shipment?.shipment_id ||
                metadata?.zipnova_shipment_id ||
                order.tracking_code ||
                order.tracking_url
            );

        if (shipmentAlreadyCreated) {
            return {
                ok: true,
                skipped: true,
                reason: "El pedido ya tiene un envío generado",
                provider: "zipnova",
                orderId: order.id,
                orderNumber: order.order_number,
                shipment: {
                    shipment_id:
                        metadata?.shipment?.shipment_id ||
                        metadata?.zipnova_shipment_id ||
                        null,
                    tracking_code:
                        order.tracking_code || null,
                    tracking_url:
                        order.tracking_url || null,
                    carrier_id:
                        order.carrier_id || null,
                    carrier_name:
                        order.carrier_name || null
                }
            };
        }

        if (!order.shipping_quote_json) {
            throw new Error(
                "El pedido no tiene cotización guardada"
            );
        }

        const providerCode =
            getProviderFromOrder(order);

        if (providerCode !== "zipnova") {
            throw new Error(
                "Este proveedor todavía no permite creación automática de envíos"
            );
        }

        const provider =
            await getProvider(
                order.store_id,
                providerCode
            );

        if (!provider) {
            throw new Error(
                "Zipnova no está configurado o activo para esta tienda"
            );
        }

        const orderItems =
            await getOrderItems(order.id);

        const result =
            await createZipnovaShipment({
                provider,
                order,
                orderItems
            });

        await saveShipmentResult({
            order,
            providerCode,
            result
        });

        return {
            ok: true,
            provider:
                providerCode,
            orderId:
                order.id,
            orderNumber:
                order.order_number,
            shipment:
                result.shipment
        };
    },

    async syncTracking({
        orderId,
        businessId = null
    }) {
        const order =
            await getOrder(
                orderId,
                businessId
            );

        if (!order) {
            throw new Error(
                "Pedido no encontrado"
            );
        }

        const metadata =
            parseJson(order.metadata_json, {}) || {};

        const shipmentId =
            metadata?.shipment?.shipment_id ||
            metadata?.zipnova_shipment_id ||
            null;

        if (!shipmentId) {
            throw new Error(
                "El pedido no tiene shipment_id de Zipnova"
            );
        }

        const provider =
            await getProvider(
                order.store_id,
                "zipnova"
            );

        if (!provider) {
            throw new Error(
                "Zipnova no está configurado para esta tienda"
            );
        }

        const shipment =
            await getZipnovaShipment({
                provider,
                shipmentId
            });

        const zipnovaStatus =
            shipment.status;

        const mappedStatus =
            zipnovaStatus === "delivered"
                ? "delivered"
                : zipnovaStatus === "in_transit"
                    ? "in_transit"
                    : zipnovaStatus === "shipped"
                        ? "shipped"
                        : "ready";

        const currentMetadata =
            parseJson(order.metadata_json, {}) || {};

        await db.query(
            `
            UPDATE tags_store_orders
            SET
                carrier_id = ?,
                carrier_name = ?,
                tracking_code = ?,
                tracking_url = ?,
                shipping_status = ?,
                metadata_json = ?,
                updated_at = NOW()
            WHERE id = ?
            LIMIT 1
            `,
            [
                shipment.carrier_id ||
                    order.carrier_id ||
                    null,

                shipment.carrier_name ||
                    order.carrier_name ||
                    null,

                shipment.carrier_tracking_id ||
                    order.tracking_code ||
                    null,

                shipment.tracking_url ||
                    order.tracking_url ||
                    null,

                mappedStatus,

                stringifyJson({
                    ...currentMetadata,
                    shipment: {
                        ...(currentMetadata.shipment || {}),
                        shipment_id:
                            shipment.shipment_id,
                        delivery_id:
                            shipment.delivery_id,
                        tracking_code:
                            shipment.carrier_tracking_id,
                        tracking_url:
                            shipment.tracking_url,
                        carrier_id:
                            shipment.carrier_id,
                        carrier_name:
                            shipment.carrier_name,
                        status:
                            shipment.status,
                        status_name:
                            shipment.status_name,
                        synced_at:
                            new Date().toISOString()
                    }
                }),

                order.id
            ]
        );

        return {
            ok: true,
            orderId:
                order.id,
            orderNumber:
                order.order_number,
            shipment
        };
    }

};