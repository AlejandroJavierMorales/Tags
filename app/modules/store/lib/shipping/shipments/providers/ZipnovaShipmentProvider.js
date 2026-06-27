// =====================================
// File: app/modules/store/lib/shipping/shipments/providers/ZipnovaShipmentProvider.js
// Descripción: Provider encargado de crear envíos reales en Zipnova desde pedidos de Tags Tienda.
// =====================================

function safeNumber(value, fallback = 0) {
    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}

function safeString(value) {
    return String(value || "").trim();
}

function buildBasicAuth(token, secret) {
    return Buffer
        .from(`${token}:${secret}`)
        .toString("base64");
}

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

function getSelectedQuote(order) {
    const quoteJson =
        parseJson(order.shipping_quote_json, null);

    if (!quoteJson) {
        return null;
    }

    return quoteJson.selectedQuote ||
        quoteJson.selected_quote ||
        quoteJson.quote ||
        quoteJson;
}

function buildDestination(order, selectedQuote) {
    const raw =
        parseJson(order.metadata_json, {}) || {};

    const shipping =
        raw.shipping || {};

    const zip =
        safeString(
            shipping.zip ||
            order.customer_zip
        );

    const city =
        safeString(
            shipping.city ||
            selectedQuote?.destination?.city ||
            selectedQuote?.raw?.destination?.city
        );

    const state =
        safeString(
            shipping.state ||
            selectedQuote?.destination?.state ||
            selectedQuote?.raw?.destination?.state
        );

    if (!city || !state) {
        throw new Error(
            "El pedido no tiene ciudad/provincia de envío guardada"
        );
    }

    const destination = {
        name:
            safeString(order.customer_name),

        document:
            safeString(
                shipping.document ||
                shipping.dni ||
                shipping.cuit ||
                shipping.cuil
            ),

        email:
            safeString(order.customer_email),

        phone:
            safeString(order.customer_phone),

        street:
            safeString(
                shipping.street ||
                order.customer_address
            ),

        street_number:
            safeString(shipping.street_number) || "S/N",

        street_extras:
            safeString(shipping.street_extras) || null,

        city,

        state,

        zipcode:
            zip
    };

    if (!destination.document) {
        throw new Error(
            "El pedido no tiene DNI/CUIT del destinatario"
        );
    }

    const pointId =
        selectedQuote?.point_id ||
        selectedQuote?.pickup_point?.point_id ||
        selectedQuote?.pickup_point?.id ||
        selectedQuote?.raw?.point_id ||
        null;

    if (pointId) {
        destination.point_id =
            Number(pointId);

        delete destination.street;
        delete destination.street_number;
        delete destination.street_extras;
        delete destination.city;
        delete destination.state;
    }

    return destination;
}

function buildItems(orderItems) {
    const items = [];

    for (const item of orderItems) {
        const qty =
            Math.max(
                1,
                safeNumber(item.quantity, 1)
            );

        for (let i = 0; i < qty; i++) {
            items.push({
                weight:
                    Math.max(
                        10,
                        safeNumber(item.weight, 100)
                    ),

                height:
                    Math.max(
                        1,
                        safeNumber(item.height, 10)
                    ),

                width:
                    Math.max(
                        1,
                        safeNumber(item.width, 10)
                    ),

                length:
                    Math.max(
                        1,
                        safeNumber(item.length, 10)
                    ),

                sku:
                    item.variant_sku ||
                    item.product_sku ||
                    String(item.product_id || item.id),

                description:
                    item.variant_title
                        ? `${item.title} - ${item.variant_title}`
                        : item.title,

                must_keep_vertical:
                    false,

                classification_id:
                    "general",

                tax_class_code:
                    "IVA21"
            });
        }
    }

    return items;
}

function normalizeShipmentResponse(data) {
    return {
        shipment_id:
            data?.id || null,

        delivery_id:
            data?.delivery_id || null,

        carrier_tracking_id:
            data?.carrier_tracking_id ||
            data?.carrier_tracking_id_alt ||
            null,

        tracking_url:
            data?.tracking_external ||
            data?.tracking ||
            null,

        tracking_external:
            data?.tracking_external || null,

        tracking:
            data?.tracking || null,

        carrier_id:
            data?.carrier?.id || null,

        carrier_name:
            data?.carrier?.name || null,

        status:
            data?.status || null,

        status_name:
            data?.status_name || null,

        label_url:
            data?.label_url ||
            data?.shipping_label_url ||
            null,

        raw:
            data
    };
}

export async function createZipnovaShipment({
    provider,
    order,
    orderItems
}) {
    const selectedQuote =
        getSelectedQuote(order);

    if (!selectedQuote) {
        throw new Error(
            "El pedido no tiene una cotización guardada"
        );
    }

    const serviceType =
        selectedQuote.service_code ||
        selectedQuote.service_type ||
        selectedQuote.service_type_code ||
        selectedQuote.raw?.service_type?.code;

    const logisticType =
        selectedQuote.logistic_type ||
        selectedQuote.raw?.logistic_type;

    const carrierId =
        selectedQuote.carrier_id ||
        selectedQuote.raw?.carrier?.id ||
        null;

    if (!serviceType) {
        throw new Error(
            "La cotización no tiene service_type"
        );
    }

    if (!logisticType) {
        throw new Error(
            "La cotización no tiene logistic_type"
        );
    }

    const items =
        buildItems(orderItems);

    if (!items.length) {
        throw new Error(
            "El pedido no tiene ítems enviables"
        );
    }

    const declaredValue =
        Math.max(
            1,
            Math.round(
                safeNumber(order.subtotal, 0)
            )
        );

    const body = {
        account_id:
            Number(provider.account_id),

        external_id:
            String(order.order_number)
                .replace(/[^a-zA-Z0-9-]/g, "-")
                .slice(0, 30),

        service_type:
            serviceType,

        logistic_type:
            logisticType,

        carrier_id:
            carrierId
                ? Number(carrierId)
                : null,

        sort_by:
            "price",

        origin_id:
            String(provider.origin_id),

        declared_value:
            declaredValue,

        source:
            "tags-tienda",

        type_packaging:
            "dynamic",

        process_immediately:
            0,

        destination:
            buildDestination(
                order,
                selectedQuote
            ),

        items
    };

    const auth =
        buildBasicAuth(
            provider.api_token,
            provider.api_secret
        );

    /* console.log(
        "ZIPNOVA CREATE SHIPMENT BODY:",
        JSON.stringify(body, null, 2)
    ); */

    const res =
        await fetch(
            "https://api.zipnova.com.ar/v2/shipments",
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Basic ${auth}`
                },
                body:
                    JSON.stringify(body)
            }
        );

    const data =
        await res.json().catch(() => ({}));

    if (!res.ok) {
        console.error(
            "ZIPNOVA CREATE SHIPMENT ERROR:",
            data
        );

        const error =
            new Error(
                "Zipnova no pudo crear el envío"
            );

        error.details =
            data;

        error.status =
            res.status;

        throw error;
    }

    return {
        request:
            body,

        shipment:
            normalizeShipmentResponse(data)
    };


}

export async function getZipnovaShipment({
    provider,
    shipmentId
}) {
    const auth =
        buildBasicAuth(
            provider.api_token,
            provider.api_secret
        );

    const res =
        await fetch(
            `https://api.zipnova.com.ar/v2/shipments/${shipmentId}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Basic ${auth}`
                }
            }
        );

    const data =
        await res.json().catch(() => ({}));

    if (!res.ok) {
        const error =
            new Error("Zipnova no pudo consultar el envío");

        error.details = data;
        error.status = res.status;

        throw error;
    }

    return normalizeShipmentResponse(data);
}
export async function downloadZipnovaShipmentDocument({
    provider,
    shipmentId,
    what = "label",
    format = "pdf",
    noStatusChange = false
}) {
    const auth =
        buildBasicAuth(
            provider.api_token,
            provider.api_secret
        );

    const cleanWhat =
        what === "document"
            ? "document"
            : "label";

    const cleanFormat =
        format === "zpl"
            ? "zpl"
            : "pdf";

    const url =
        `https://api.zipnova.com.ar/v2/shipments/${shipmentId}/${cleanWhat}.${cleanFormat}` +
        (
            noStatusChange
                ? "?no_status_change=1"
                : ""
        );

    const res =
        await fetch(
            url,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Basic ${auth}`
                }
            }
        );

    const data =
        await res.json().catch(() => ({}));

    if (!res.ok) {
        const error =
            new Error("Zipnova no pudo descargar el documento");

        error.details = data;
        error.status = res.status;

        throw error;
    }

    return data;
}