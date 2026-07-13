// =====================================
// API: /api/store/admin/orders/shipping-status
// Descripción:
// Actualiza estado logístico, tracking y
// transportista de un pedido de Tags Tienda.
// Envía emails de despacho y entrega evitando
// envíos duplicados.
//
// Contexto:
// store
// =====================================

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

import crypto
    from "crypto";

import { db }
    from "@/app/lib/tags-db";

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

    return String(
        value || ""
    ).trim();

}

function getBaseUrl() {

    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL_PROD;

}

function buildTrackingUrl(
    template,
    code
) {

    if (!template || !code) {
        return null;
    }

    const encodedCode =
        encodeURIComponent(code);

    return String(template)
        .replace(
            "{code}",
            encodedCode
        )
        .replace(
            "{tracking}",
            encodedCode
        );

}

function createReviewToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");

}

async function generateUniqueReviewToken() {

    for (
        let attempt = 0;
        attempt < 5;
        attempt++
    ) {

        const token =
            createReviewToken();

        const [rows] =
            await db.query(
                `
                SELECT id
                FROM tags_store_orders
                WHERE review_token = ?
                LIMIT 1
                `,
                [
                    token
                ]
            );

        if (!rows.length) {
            return token;
        }

    }

    throw new Error(
        "No se pudo generar un token de calificación único"
    );

}

async function generateUniqueTagsReviewsToken() {

    for (
        let attempt = 0;
        attempt < 5;
        attempt++
    ) {

        const token =
            createReviewToken();

        const [rows] =
            await db.query(
                `
                SELECT id
                FROM tags_store_review_tokens
                WHERE token = ?
                LIMIT 1
                `,
                [
                    token
                ]
            );

        if (!rows.length) {
            return token;
        }

    }

    throw new Error(
        "No se pudo generar un token único para Tags Reviews"
    );

}

async function getOrCreateTagsReviewsAccess(
    orderData
) {

    const [pageRows] =
        await db.query(
            `
            SELECT slug
            FROM tags_qr_pages
            WHERE business_id = ?
            AND page_type = 'client_reviews'
            AND status = 'published'
            ORDER BY id DESC
            LIMIT 1
            `,
            [
                orderData.store_business_id
            ]
        );

    const reviewsSlug =
        clean(
            pageRows?.[0]?.slug
        );

    if (!reviewsSlug) {
        throw new Error(
            "La página publicada de Tags Reviews no fue encontrada"
        );
    }

    const [existingRows] =
        await db.query(
            `
            SELECT token
            FROM tags_store_review_tokens
            WHERE store_id = ?
            AND order_id = ?
            AND used_at IS NULL
            AND expires_at > NOW()
            ORDER BY id DESC
            LIMIT 1
            `,
            [
                orderData.store_id,
                orderData.id
            ]
        );

    let token =
        clean(
            existingRows?.[0]?.token
        );

    if (!token) {

        token =
            await generateUniqueTagsReviewsToken();

        await db.query(
            `
            INSERT INTO tags_store_review_tokens
            (
                store_id,
                order_id,
                token,
                customer_name,
                customer_email,
                customer_phone,
                expires_at,
                created_at
            )
            VALUES
            (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 90 DAY), NOW())
            `,
            [
                orderData.store_id,
                orderData.id,
                token,
                orderData.customer_name,
                orderData.customer_email,
                orderData.customer_phone
            ]
        );

    }

    return {
        token,
        slug:
            reviewsSlug
    };

}

async function getOrderEmailData(
    orderId
) {

    const [orderRows] =
        await db.query(
            `
            SELECT
                o.*,

                s.name AS store_name,
                s.business_id AS store_business_id,
                s.slug,
                s.logo_url,
                s.whatsapp AS store_whatsapp,
                s.email AS store_email,
                s.currency AS store_currency,
                s.styles_json AS store_styles_json

            FROM tags_store_orders o

            INNER JOIN tags_stores s
                ON s.id = o.store_id

            WHERE o.id = ?

            LIMIT 1
            `,
            [
                orderId
            ]
        );

    const orderData =
        orderRows?.[0] || null;

    if (!orderData) {
        return null;
    }

    const [items] =
        await db.query(
            `
            SELECT
                oi.*,

                oi.title AS product_title,

                p.slug AS product_slug,
                p.is_visible AS product_is_visible,
                p.status AS product_status

            FROM tags_store_order_items oi

            LEFT JOIN tags_store_products p
                ON p.id = oi.product_id

            WHERE oi.order_id = ?

            ORDER BY oi.id ASC
            `,
            [
                orderId
            ]
        );

    return {
        orderData,
        items: items || []
    };

}

function buildStoreForEmail(
    orderData
) {

    let stylesJson = {};

    if (
        orderData?.store_styles_json &&
        typeof orderData.store_styles_json === "object"
    ) {
        stylesJson =
            orderData.store_styles_json;
    } else if (orderData?.store_styles_json) {

        try {
            stylesJson =
                JSON.parse(
                    orderData.store_styles_json
                );
        } catch {
            stylesJson = {};
        }

    }

    return {
        name:
            orderData.store_name,

        slug:
            orderData.slug,

        logo_url:
            orderData.logo_url,

        whatsapp:
            orderData.store_whatsapp,

        email:
            orderData.store_email,

        store_email:
            orderData.store_email,

        currency:
            orderData.store_currency ||
            "ARS",

        styles_json:
            stylesJson
    };

}

async function sendShippedEmail(
    orderId
) {

    try {

        const emailData =
            await getOrderEmailData(
                orderId
            );

        if (!emailData) {
            return;
        }

        const {
            orderData,
            items
        } = emailData;

        if (
            !orderData.customer_email ||
            Number(
                orderData.email_order_shipped_sent || 0
            ) === 1
        ) {
            return;
        }

        await sendStoreOrderEmail({
            store:
                buildStoreForEmail(
                    orderData
                ),

            order:
                orderData,

            items,

            type:
                "order_shipped"
        });

        await db.query(
            `
            UPDATE tags_store_orders
            SET
                email_order_shipped_sent = 1,
                updated_at = NOW()
            WHERE id = ?
            AND email_order_shipped_sent = 0
            `,
            [
                orderId
            ]
        );

    } catch (err) {

        console.error(
            "STORE SHIPPED EMAIL ERROR:",
            err
        );

    }

}

async function sendDeliveredEmail(
    orderId
) {

    try {

        const emailData =
            await getOrderEmailData(
                orderId
            );

        if (!emailData) {
            return;
        }

        let {
            orderData,
            items
        } = emailData;

        if (
            !orderData.customer_email ||
            Number(
                orderData.email_order_delivered_sent || 0
            ) === 1
        ) {
            return;
        }

        let reviewToken =
            clean(
                orderData.review_token
            );

        if (!reviewToken) {

            reviewToken =
                await generateUniqueReviewToken();

            await db.query(
                `
                UPDATE tags_store_orders
                SET
                    review_token = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND (
                    review_token IS NULL
                    OR review_token = ''
                )
                `,
                [
                    reviewToken,
                    orderId
                ]
            );

            const [tokenRows] =
                await db.query(
                    `
                    SELECT review_token
                    FROM tags_store_orders
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [
                        orderId
                    ]
                );

            reviewToken =
                clean(
                    tokenRows?.[0]?.review_token
                ) || reviewToken;

        }

        const tagsReviewsAccess =
            await getOrCreateTagsReviewsAccess(
                orderData
            );

        const base =
            getBaseUrl();

        const commerceReviewUrl =
            `${base}/p/${orderData.slug}/reviews/${reviewToken}`;

        const tagsReviewsUrl =
            `${base}/p/${tagsReviewsAccess.slug}?token=${tagsReviewsAccess.token}`;

        const trackingUrl =
            `${base}/p/${orderData.slug}/orders/track?order=${orderData.order_number}`;

        orderData = {
            ...orderData,
            review_token:
                reviewToken
        };

        await sendStoreOrderEmail({
            store:
                buildStoreForEmail(
                    orderData
                ),

            order:
                orderData,

            items,

            type:
                "order_delivered",

            buttons: [
                {
                    label:
                        "Calificar productos",

                    href:
                        commerceReviewUrl,

                    variant:
                        "primary"
                },
                {
                    label:
                        "Calificar experiencia",

                    href:
                        tagsReviewsUrl,

                    variant:
                        "secondary"
                },
                {
                    label:
                        "Ver pedido",

                    href:
                        trackingUrl,

                    variant:
                        "light"
                }
            ]
        });

        await db.query(
            `
            UPDATE tags_store_orders
            SET
                email_order_delivered_sent = 1,
                review_invitation_sent_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
            AND email_order_delivered_sent = 0
            `,
            [
                orderId
            ]
        );

    } catch (err) {

        /*
         * No marcamos el email como enviado si falla.
         * De esa manera puede reintentarse guardando
         * nuevamente el estado entregado.
         */

        console.error(
            "STORE DELIVERED EMAIL ERROR:",
            err
        );

    }

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

        if (
            !businessId ||
            !orderId
        ) {
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

        if (
            shipping_status &&
            !validShippingStatuses.includes(
                shipping_status
            )
        ) {
            return Response.json(
                {
                    error:
                        "Estado de envío inválido"
                },
                {
                    status: 400
                }
            );
        }

        const [storeRows] =
            await db.query(
                `
                SELECT
                    id
                FROM tags_stores
                WHERE business_id = ?
                LIMIT 1
                `,
                [
                    businessId
                ]
            );

        const store =
            storeRows?.[0];

        if (!store) {
            return Response.json(
                {
                    error:
                        "Tienda no encontrada"
                },
                {
                    status: 404
                }
            );
        }

        const [orderRows] =
            await db.query(
                `
                SELECT
                    id,
                    shipping_status,
                    review_token,
                    email_order_shipped_sent,
                    email_order_delivered_sent
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
            orderRows?.[0];

        if (!order) {
            return Response.json(
                {
                    error:
                        "Pedido no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        const previousShippingStatus =
            order.shipping_status;

        const nextShippingStatus =
            shipping_status ||
            previousShippingStatus;

        let finalCarrierName =
            clean(
                carrier_name
            ) || null;

        let finalTrackingUrl =
            clean(
                tracking_url
            ) || null;

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
                carrierRows?.[0];

            if (!carrier) {
                return Response.json(
                    {
                        error:
                            "Transportista no encontrado"
                    },
                    {
                        status: 404
                    }
                );
            }

            finalCarrierName =
                carrier.name;

            if (!finalTrackingUrl) {
                finalTrackingUrl =
                    buildTrackingUrl(
                        carrier.tracking_url_template,
                        clean(
                            tracking_code
                        )
                    );
            }

        }

        await db.query(
            `
            UPDATE tags_store_orders
            SET
                shipping_status =
                    COALESCE(
                        ?,
                        shipping_status
                    ),

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
                clean(
                    tracking_code
                ) || null,
                finalTrackingUrl,
                clean(
                    tracking_notes
                ) || null,
                carrier_id || null,
                finalCarrierName,
                clean(
                    shipping_label_url
                ) || null,
                orderId,
                store.id
            ]
        );

        /*
         * Conserva el circuito actual de despacho.
         * El flag impide duplicados aunque vuelva
         * a guardarse el mismo estado.
         */

        if (
            nextShippingStatus === "shipped" &&
            Number(
                order.email_order_shipped_sent || 0
            ) === 0
        ) {
            await sendShippedEmail(
                orderId
            );
        }

        /*
         * El email de entrega se dispara cuando el
         * pedido llega a delivered.
         *
         * Si el primer intento de email falla, el flag
         * permanece en cero y puede reintentarse
         * guardando nuevamente el estado delivered.
         */

        if (
            nextShippingStatus === "delivered" &&
            Number(
                order.email_order_delivered_sent || 0
            ) === 0
        ) {
            await sendDeliveredEmail(
                orderId
            );
        }

        return Response.json({
            ok: true,

            shipping_status:
                nextShippingStatus,

            tracking_url:
                finalTrackingUrl,

            carrier_name:
                finalCarrierName
        });

    } catch (err) {

        console.error(
            "STORE ORDER SHIPPING STATUS ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error actualizando tracking"
            },
            {
                status: 500
            }
        );

    }

}