// =====================================
// API: /api/store/payments/mercadopago/webhook
// Descripción: Recibe notificaciones de Mercado Pago, actualiza pagos/pedidos y envía email de pago confirmado.
// Uso: Webhook Mercado Pago Checkout Pro.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import {
    MercadoPagoConfig,
    Payment
}
    from "mercadopago";

import {
    sendStoreOrderEmail
}
    from "@/app/modules/store/lib/sendStoreOrderEmail";

import {
    confirmOrderStock
}
    from "@/app/modules/store/lib/updateOrderStock";
import {
    createHmac,
    timingSafeEqual
} from "node:crypto";

function validateMercadoPagoSignature(
    req,
    paymentId
) {
    const secret =
        process.env.MERCADOPAGO_WEBHOOK_KEY;

    if (!secret) return false;

    const signature =
        req.headers.get("x-signature") ||
        "";

    const requestId =
        req.headers.get("x-request-id") ||
        "";

    const parts =
        Object.fromEntries(
            signature
                .split(",")
                .map(part =>
                    part.trim().split("=")
                )
                .filter(part =>
                    part.length === 2
                )
        );

    if (!parts.ts || !parts.v1) {
        return false;
    }

    const manifest =
        `id:${String(paymentId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`;

    const expected =
        createHmac("sha256", secret)
            .update(manifest)
            .digest("hex");

    const received =
        Buffer.from(parts.v1, "hex");

    const valid =
        Buffer.from(expected, "hex");

    return (
        received.length === valid.length &&
        timingSafeEqual(received, valid)
    );
}

function mapMPStatusToStore(status) {
    if (status === "approved") {
        return "paid";
    }

    if (
        status === "rejected" ||
        status === "cancelled"
    ) {
        return "pending";
    }

    if (status === "refunded") {
        return "refunded";
    }

    return "pending";
}

export async function POST(req) {
    const conn =
        await db.getConnection();

    let emailPayload =
        null;

    try {
        const body =
            await req.json().catch(() => ({}));

        const storeId =
            new URL(req.url)
                .searchParams
                .get("storeId");

        const paymentId =
            body?.data?.id ||
            body?.id ||
            null;

        if (!paymentId || !storeId) {
            return Response.json({
                ok: true,
                ignored: true
            });
        }

        const [settingsRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_store_payment_settings
                WHERE provider = 'mercado_pago'
                AND store_id = ?
                AND is_active = 1
                AND access_token IS NOT NULL
                LIMIT 1
                `
                ,
                [storeId]
            );

        let mpPayment =
            null;

        const matchedSettings =
            settingsRows[0] || null;

        if (matchedSettings) {
            const client =
                new MercadoPagoConfig({
                    accessToken:
                        matchedSettings.access_token
                });

            const payment =
                new Payment(client);

            mpPayment =
                await payment.get({
                    id: paymentId
                });
        }

        if (
            !validateMercadoPagoSignature(
                req,
                paymentId
            )
        ) {
            return Response.json(
                { error: "Webhook no autorizado" },
                { status: 401 }
            );
        }

        if (!mpPayment || !matchedSettings) {
            return Response.json({
                ok: true,
                ignored: true
            });
        }

        const orderId =
            mpPayment.external_reference ||
            mpPayment.metadata?.order_id ||
            null;

        if (!orderId) {
            return Response.json({
                ok: true,
                ignored: true
            });
        }

        const paymentStatus =
            mapMPStatusToStore(
                mpPayment.status
            );

        const paymentRecordStatus =
            paymentStatus === "paid"
                ? "approved"
                : (
                    mpPayment.status === "rejected" ||
                    mpPayment.status === "cancelled"
                )
                    ? "rejected"
                    : paymentStatus;

        await conn.beginTransaction();

        const [orderRows] =
            await conn.query(
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
                AND o.store_id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [
                    orderId,
                    matchedSettings.store_id
                ]
            );

        const order =
            orderRows[0];

        if (!order) {
            await conn.rollback();

            return Response.json({
                ok: true,
                ignored: true
            });
        }

        const paidAmount =
            Number(
                mpPayment.transaction_amount ||
                0
            );

        const paidCurrency =
            String(
                mpPayment.currency_id ||
                ""
            ).toUpperCase();

        const orderCurrency =
            String(
                order.currency ||
                "ARS"
            ).toUpperCase();

        if (
            paymentStatus === "paid" &&
            (
                Math.abs(
                    paidAmount -
                    Number(order.total || 0)
                ) > 0.01 ||
                paidCurrency !== orderCurrency
            )
        ) {
            await conn.rollback();

            return Response.json(
                {
                    error:
                        "El importe o la moneda del pago no coinciden con el pedido"
                },
                { status: 409 }
            );
        }

        const [paymentRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_store_payments
                WHERE order_id = ?
                AND store_id = ?
                AND provider = 'mercado_pago'
                ORDER BY id DESC
                LIMIT 1
                FOR UPDATE
                `,
                [
                    order.id,
                    order.store_id
                ]
            );

        const paymentRow =
            paymentRows[0] || null;

        const [paymentUpdate] =
            await conn.query(
            `
            UPDATE tags_store_payments
            SET
                provider_payment_id = ?,
                provider_status = ?,
                payment_status = ?,
                raw_response_json = ?,
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                String(mpPayment.id),
                mpPayment.status || null,
                paymentRecordStatus,
                JSON.stringify(mpPayment),
                paymentRow?.id || 0
            ]
        );

        if (paymentUpdate.affectedRows === 0) {
            await conn.query(
                `
                INSERT INTO tags_store_payments (
                    store_id,
                    order_id,
                    provider,
                    provider_payment_id,
                    provider_status,
                    amount,
                    currency,
                    payment_status,
                    raw_response_json,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?, ?, 'mercado_pago',
                    ?, ?, ?, ?, ?, ?,
                    NOW(), NOW()
                )
                `,
                [
                    order.store_id,
                    order.id,
                    String(mpPayment.id),
                    mpPayment.status || null,
                    paidAmount,
                    paidCurrency || orderCurrency,
                    paymentRecordStatus,
                    JSON.stringify(mpPayment)
                ]
            );
        }

        if (
            paymentStatus === "paid" &&
            Number(order.stock_reserved || 0) === 1
        ) {

            await confirmOrderStock(
                conn,
                order.id
            );

            await conn.query(
                `
        UPDATE tags_store_orders
        SET
            payment_status = 'paid',
            order_status = 'confirmed',
            stock_reserved = 0,
            updated_at = NOW()
        WHERE id = ?
        AND store_id = ?
        `,
                [
                    order.id,
                    order.store_id
                ]
            );

        } else {

            await conn.query(
                `
                        UPDATE tags_store_orders
                        SET
                            payment_status = ?,
                            updated_at = NOW()
                        WHERE id = ?
                        AND store_id = ?
                        `,
                [
                    paymentStatus,
                    order.id,
                    order.store_id
                ]
            );

        }

        if (
            paymentStatus === "paid" &&
            order.customer_email &&
            Number(order.email_payment_paid_sent || 0) === 0
        ) {

            const emailOrder = {
                ...order,
                payment_status: "paid",
                order_status: "confirmed",
                stock_reserved: 0
            };

            emailPayload = {
                store: {
                    name: order.store_name,
                    slug: order.slug,
                    logo_url: order.logo_url
                },
                order: emailOrder,
                items: (
                    await conn.query(
                        `
                        SELECT *
                        FROM tags_store_order_items
                        WHERE order_id = ?
                        ORDER BY id ASC
                        `,
                        [order.id]
                    )
                )[0]
            };
        }

        await conn.commit();

        if (emailPayload) {
            try {
                await sendStoreOrderEmail({
                    store: emailPayload.store,
                    order: emailPayload.order,
                    items: emailPayload.items,
                    type: "payment_paid"
                });

                await db.query(
                    `
                    UPDATE tags_store_orders
                    SET email_payment_paid_sent = 1
                    WHERE id = ?
                    `,
                    [emailPayload.order.id]
                );

            } catch (err) {
                console.error(
                    "STORE PAYMENT PAID EMAIL ERROR:",
                    err
                );
            }
        }

        return Response.json({
            ok: true
        });

    } catch (err) {
        await conn.rollback();

        console.error(
            "STORE MP WEBHOOK ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error procesando webhook"
            },
            {
                status: 500
            }
        );

    } finally {
        conn.release();
    }
}
