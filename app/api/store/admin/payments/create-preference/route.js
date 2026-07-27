// =====================================
// API: /api/store/public/payments/create-preference
// Descripción: Crea preferencia Mercado Pago para un pedido de Tags Tienda.
// Uso: Checkout público Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
    verifyStoreCheckoutToken
} from "@/app/modules/store/lib/storeCheckoutToken";

import {
    MercadoPagoConfig,
    Preference
} from "mercadopago";

function parseJson(value, fallback = {}) {
    if (!value) return fallback;
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function getBaseUrl(req) {
    return (
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.BASE_URL_PROD ||
        process.env.NEXT_PUBLIC_BASE_URL_PROD ||
        process.env.NEXT_PUBLIC_APP_URL ||
        new URL(req.url).origin
    ).replace(/\/+$/, "");
}

export async function POST(req) {
    const conn =
        await db.getConnection();

    try {
        const body =
            await req.json();

        const {
            orderId,
            checkoutToken
        } = body;

        if (!orderId) {
            return Response.json(
                {
                    error: "orderId es requerido"
                },
                {
                    status: 400
                }
            );
        }

        const [orderRows] =
            await conn.query(
                `
                SELECT
                    o.*,
                    s.slug AS store_slug,
                    s.name AS store_name
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

        const order =
            orderRows[0];

        if (!order) {
            return Response.json(
                {
                    error: "Pedido no encontrado"
                },
                {
                    status: 404
                }
            );
        }

        if (
            order.payment_method !==
                "mercado_pago" ||
            order.payment_status === "paid" ||
            !verifyStoreCheckoutToken(
                {
                    orderId: order.id,
                    storeId: order.store_id,
                    orderNumber:
                        order.order_number
                },
                checkoutToken
            )
        ) {
            return Response.json(
                {
                    error:
                        "El pedido no está habilitado para iniciar este pago"
                },
                { status: 403 }
            );
        }

        const [existingRows] =
            await conn.query(
                `
                SELECT
                    provider_preference_id,
                    payment_url
                FROM tags_store_payments
                WHERE order_id = ?
                AND store_id = ?
                AND provider = 'mercado_pago'
                AND payment_status = 'pending'
                AND payment_url IS NOT NULL
                ORDER BY id DESC
                LIMIT 1
                `,
                [
                    order.id,
                    order.store_id
                ]
            );

        if (existingRows[0]) {
            return Response.json({
                ok: true,
                reused: true,
                preferenceId:
                    existingRows[0]
                        .provider_preference_id,
                initPoint:
                    existingRows[0]
                        .payment_url
            });
        }

        const [paymentRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_store_payment_settings
                WHERE store_id = ?
                AND provider = 'mercado_pago'
                AND is_active = 1
                LIMIT 1
                `,
                [
                    order.store_id
                ]
            );

        const paymentSettings =
            paymentRows[0];

        if (!paymentSettings?.access_token) {
            return Response.json(
                {
                    error: "Mercado Pago no está configurado para esta tienda"
                },
                {
                    status: 400
                }
            );
        }

        const [items] =
            await conn.query(
                `
                SELECT *
                FROM tags_store_order_items
                WHERE order_id = ?
                ORDER BY id ASC
                `,
                [
                    order.id
                ]
            );

        const baseUrl =
            getBaseUrl(req);

        const client =
            new MercadoPagoConfig({
                accessToken:
                    paymentSettings.access_token
            });

        const preference =
            new Preference(client);

        const mpItems =
            items.map(item => ({
                id:
                    String(item.product_id),
                title:
                    item.variant_title
                        ? `${item.title} - ${item.variant_title}`
                        : item.title,
                quantity:
                    Number(item.quantity || 1),
                unit_price:
                    Number(item.unit_price || 0),
                currency_id:
                    order.currency || "ARS"
            }));

        if (Number(order.shipping_total || 0) > 0) {
            mpItems.push({
                id: "shipping",
                title:
                    order.shipping_method_name ||
                    "Envío",
                quantity: 1,
                unit_price:
                    Number(order.shipping_total || 0),
                currency_id: "ARS"
            });
        }

        if (Number(order.discount_total || 0) > 0) {
            mpItems.push({
                id: "discount",
                title:
                    order.coupon_code
                        ? `Descuento ${order.coupon_code}`
                        : "Descuento",
                quantity: 1,
                unit_price:
                    -Number(order.discount_total || 0),
                currency_id: "ARS"
            });
        }

        const paymentItems = [{
            id:
                String(order.id),
            title:
                `Pedido ${order.order_number} - ${order.store_name}`,
            quantity:
                1,
            unit_price:
                Number(order.total || 0),
            currency_id:
                order.currency || "ARS"
        }];

        const preferenceResult =
            await preference.create({
                body: {
                    items:
                        paymentItems,
                    statement_descriptor:
                        "TAGS TIENDA",
                    payer: {
                        name:
                            order.customer_name || undefined,
                        email:
                            order.customer_email || undefined,
                        phone: {
                            number:
                                order.customer_phone || undefined
                        }
                    },

                    external_reference:
                        String(order.id),

                    metadata: {
                        order_id:
                            order.id,
                        store_id:
                            order.store_id,
                        order_number:
                            order.order_number
                    },

                    notification_url:
                        `${baseUrl}/api/store/payments/mercadopago/webhook?storeId=${order.store_id}`,

                    back_urls: {
                        success:
                            `${baseUrl}/p/${order.store_slug}/payment/success?orderId=${order.id}`,
                        pending:
                            `${baseUrl}/p/${order.store_slug}/payment/pending?orderId=${order.id}`,
                        failure:
                            `${baseUrl}/p/${order.store_slug}/payment/failure?orderId=${order.id}`
                    },

                    auto_return:  "approved"
                }
            });

        const settingsJson =
            parseJson(
                paymentSettings.settings_json,
                {}
            );

        await conn.query(
            `
            INSERT INTO tags_store_payments (
                store_id,
                order_id,
                provider,
                provider_preference_id,
                provider_status,
                amount,
                currency,
                payment_status,
                payment_url,
                raw_response_json,
                created_at,
                updated_at
            )
            VALUES (
                ?, ?, 'mercado_pago', ?, ?, ?, ?, 'pending', ?, ?, NOW(), NOW()
            )
            `,
            [
                order.store_id,
                order.id,
                preferenceResult.id,
                "preference_created",
                Number(order.total || 0),
                order.currency || "ARS",
                preferenceResult.init_point,
                JSON.stringify({
                    preference: preferenceResult,
                    settings: {
                        account_email:
                            paymentSettings.account_email,
                        account_name:
                            paymentSettings.account_name,
                        mode:
                            settingsJson.mode || "production"
                    }
                })
            ]
        );

        await conn.query(
            `
            UPDATE tags_store_orders
            SET
                payment_method = 'mercado_pago',
                payment_status = 'pending',
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                order.id
            ]
        );

        return Response.json({
            ok: true,
            preferenceId:
                preferenceResult.id,
            initPoint:
                preferenceResult.init_point,
            sandboxInitPoint:
                preferenceResult.sandbox_init_point || null
        });

    } catch (err) {
        console.error(
            "STORE MP CREATE PREFERENCE ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error creando preferencia de Mercado Pago"
            },
            {
                status: 500
            }
        );

    } finally {
        conn.release();
    }
}
