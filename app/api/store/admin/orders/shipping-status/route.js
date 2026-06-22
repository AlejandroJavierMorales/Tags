// =====================================
// API: /api/store/admin/orders/shipping-status
// Descripción: Actualiza estado logístico, tracking y transportista de un pedido.
// Uso: Admin Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import {
    sendStoreOrderEmail
}
from "@/app/modules/store/lib/sendStoreOrderEmail";

const validShippingStatuses = [
    "pending",
    "ready",
    "shipped",
    "in_transit",
    "delivered",
    "returned",
    "cancelled"
];

function clean(value) {
    return String(value || "").trim();
}

function buildTrackingUrl(template, code) {
    if (!template || !code) {
        return null;
    }

    const encodedCode =
        encodeURIComponent(code);

    return String(template)
        .replace("{code}", encodedCode)
        .replace("{tracking}", encodedCode);
}

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            businessId,
            orderId,
            shipping_status,
            tracking_code,
            tracking_url,
            carrier_id,
            carrier_name,
            tracking_notes,
            shipping_label_url
        } = body;

        if (!businessId || !orderId) {
            return Response.json(
                { error: "businessId y orderId son requeridos" },
                { status: 400 }
            );
        }

        if (
            shipping_status &&
            !validShippingStatuses.includes(shipping_status)
        ) {
            return Response.json(
                { error: "Estado de envío inválido" },
                { status: 400 }
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT id
                FROM tags_stores
                WHERE business_id = ?
                LIMIT 1
                `,
                [businessId]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json(
                { error: "Tienda no encontrada" },
                { status: 404 }
            );
        }

        const [orderRows] =
            await db.query(
                `
                SELECT id
                FROM tags_store_orders
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
                `,
                [
                    orderId,
                    store.id
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

        let finalCarrierName =
            clean(carrier_name) || null;

        let finalTrackingUrl =
            clean(tracking_url) || null;

        if (carrier_id) {
            const [carrierRows] =
                await db.query(
                    `
                    SELECT
                        id,
                        name,
                        tracking_url_template
                    FROM tags_store_carriers
                    WHERE id = ?
                    AND store_id = ?
                    LIMIT 1
                    `,
                    [
                        carrier_id,
                        store.id
                    ]
                );

            const carrier =
                carrierRows[0];

            if (!carrier) {
                return Response.json(
                    { error: "Transportista no encontrado" },
                    { status: 404 }
                );
            }

            finalCarrierName =
                carrier.name;

            if (!finalTrackingUrl) {
                finalTrackingUrl =
                    buildTrackingUrl(
                        carrier.tracking_url_template,
                        clean(tracking_code)
                    );
            }
        }

        await db.query(
            `
            UPDATE tags_store_orders
            SET
                shipping_status = COALESCE(?, shipping_status),
                tracking_code = ?,
                tracking_url = ?,
                tracking_notes = ?,
                carrier_id = ?,
                carrier_name = ?,
                shipping_label_url = ?,
                updated_at = NOW()
            WHERE id = ?
            AND store_id = ?
            `,
            [
                shipping_status || null,
                clean(tracking_code) || null,
                finalTrackingUrl,
                clean(tracking_notes) || null,
                carrier_id || null,
                finalCarrierName,
                clean(shipping_label_url) || null,
                orderId,
                store.id
            ]
        );

        if (shipping_status === "shipped") {
            try {
                const [orderDataRows] =
                    await db.query(
                        `
                        SELECT
                            o.*,
                            s.name AS store_name,
                            s.slug,
                            s.logo_url
                        FROM tags_store_orders o
                        INNER JOIN tags_stores s
                            ON s.id = o.store_id
                        WHERE o.id = ?
                        LIMIT 1
                        `,
                        [orderId]
                    );

                const orderData =
                    orderDataRows[0];

                if (
                    orderData?.customer_email &&
                    Number(orderData.email_order_shipped_sent || 0) === 0
                ) {
                    await sendStoreOrderEmail({
                        store: {
                            name: orderData.store_name,
                            slug: orderData.slug,
                            logo_url: orderData.logo_url
                        },
                        order: orderData,
                        items: [],
                        type: "order_shipped"
                    });

                    await db.query(
                        `
                        UPDATE tags_store_orders
                        SET email_order_shipped_sent = 1
                        WHERE id = ?
                        `,
                        [orderId]
                    );
                }

            } catch (err) {
                console.error(
                    "STORE SHIPPED EMAIL ERROR:",
                    err
                );
            }
        }

        return Response.json({
            ok: true,
            tracking_url: finalTrackingUrl,
            carrier_name: finalCarrierName
        });

    } catch (err) {
        console.error(
            "STORE ORDER SHIPPING STATUS ERROR:",
            err
        );

        return Response.json(
            { error: "Error actualizando tracking" },
            { status: 500 }
        );
    }
}