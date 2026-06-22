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

function mapMPStatusToStore(status) {
    if (status === "approved") {
        return "paid";
    }

    if (
        status === "rejected" ||
        status === "cancelled"
    ) {
        return "cancelled";
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

        const paymentId =
            body?.data?.id ||
            body?.id ||
            null;

        if (!paymentId) {
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
                AND is_active = 1
                AND access_token IS NOT NULL
                `
            );

        let mpPayment =
            null;

        let matchedSettings =
            null;

        for (const settings of settingsRows) {
            try {
                const client =
                    new MercadoPagoConfig({
                        accessToken:
                            settings.access_token
                    });

                const payment =
                    new Payment(client);

                const result =
                    await payment.get({
                        id: paymentId
                    });

                if (result?.id) {
                    mpPayment =
                        result;

                    matchedSettings =
                        settings;

                    break;
                }

            } catch {
                // Este token no corresponde a ese pago.
            }
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

        await conn.query(
            `
            UPDATE tags_store_payments
            SET
                provider_payment_id = ?,
                provider_status = ?,
                payment_status = ?,
                raw_response_json = ?,
                updated_at = NOW()
            WHERE order_id = ?
            AND store_id = ?
            AND provider = 'mercado_pago'
            `,
            [
                String(mpPayment.id),
                mpPayment.status || null,
                paymentStatus,
                JSON.stringify(mpPayment),
                order.id,
                order.store_id
            ]
        );

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
                order: emailOrder
            };
        }

        await conn.commit();

        if (emailPayload) {
            try {
                await sendStoreOrderEmail({
                    store: emailPayload.store,
                    order: emailPayload.order,
                    items: [],
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