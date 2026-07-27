// =====================================
// API: /api/store/admin/orders/status
// Descripción: Actualiza estado de pedido, estado de pago y stock reservado/real de Tags Tienda.
// Uso: Admin Tags Tienda.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import {
    confirmOrderStock,
    restoreConfirmedOrderStock
}
from "@/app/modules/store/lib/updateOrderStock";

const validOrderStatuses = [
    "new",
    "confirmed",
    "preparing",
    "shipped",
    "completed",
    "cancelled"
];

const validPaymentStatuses = [
    "pending",
    "paid",
    "cancelled",
    "refunded"
];

const stockConfirmedStatuses = [
    "confirmed",
    "preparing",
    "shipped",
    "completed"
];

export async function POST(req) {
    const conn =
        await db.getConnection();

    try {
        const body =
            await req.json();

        const {
            businessId,
            orderId,
            order_status,
            payment_status
        } = body;

        if (!businessId || !orderId) {
            return Response.json(
                { error: "businessId y orderId son requeridos" },
                { status: 400 }
            );
        }

        if (
            order_status &&
            !validOrderStatuses.includes(order_status)
        ) {
            return Response.json(
                { error: "Estado de pedido inválido" },
                { status: 400 }
            );
        }

        if (
            payment_status &&
            !validPaymentStatuses.includes(payment_status)
        ) {
            return Response.json(
                { error: "Estado de pago inválido" },
                { status: 400 }
            );
        }

        await conn.beginTransaction();

        const [storeRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_stores
                WHERE business_id = ?
                AND app_type = 'store'
                LIMIT 1
                `,
                [businessId]
            );

        const store =
            storeRows[0];

        if (!store) {
            await conn.rollback();

            return Response.json(
                { error: "Tienda no encontrada" },
                { status: 404 }
            );
        }

        const [orderRows] =
            await conn.query(
                `
                SELECT
                    id,
                    order_status,
                    payment_status,
                    stock_reserved,
                    coupon_id
                FROM tags_store_orders
                WHERE id = ?
                AND store_id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [
                    orderId,
                    store.id
                ]
            );

        const order =
            orderRows[0];

        if (!order) {
            await conn.rollback();

            return Response.json(
                { error: "Pedido no encontrado" },
                { status: 404 }
            );
        }

        const currentOrderStatus =
            order.order_status;

        const currentPaymentStatus =
            order.payment_status;

        const nextOrderStatus =
            order_status || currentOrderStatus;

        const nextPaymentStatus =
            payment_status || currentPaymentStatus;

        let nextStockReserved =
            Number(order.stock_reserved || 0);

        const wasStockConfirmed =
            stockConfirmedStatuses.includes(
                currentOrderStatus
            );

        const willStockBeConfirmed =
            stockConfirmedStatuses.includes(
                nextOrderStatus
            ) ||
            nextPaymentStatus === "paid";

        // Reserva pendiente -> pedido confirmado/pagado:
        // descuenta stock real y libera reserva.
        if (
            nextStockReserved === 1 &&
            willStockBeConfirmed &&
            nextOrderStatus !== "cancelled"
        ) {
            await confirmOrderStock(
                conn,
                order.id
            );

            nextStockReserved = 0;
        }

        // Reserva pendiente -> cancelado:
        // libera reserva sin tocar stock real.
        if (
            Number(order.stock_reserved || 0) === 1 &&
            nextOrderStatus === "cancelled"
        ) {
            nextStockReserved = 0;
        }

        // Pedido ya confirmado -> cancelado:
        // repone stock real.
        if (
            Number(order.stock_reserved || 0) === 0 &&
            wasStockConfirmed &&
            nextOrderStatus === "cancelled"
        ) {
            await restoreConfirmedOrderStock(
                conn,
                order.id
            );
        }

        if (
            currentOrderStatus !== "cancelled" &&
            nextOrderStatus === "cancelled" &&
            order.coupon_id
        ) {
            await conn.query(
                `
                UPDATE tags_store_coupons
                SET
                    used_count =
                        GREATEST(
                            0,
                            used_count - 1
                        ),
                    updated_at = NOW()
                WHERE id = ?
                AND store_id = ?
                `,
                [
                    order.coupon_id,
                    store.id
                ]
            );
        }

        await conn.query(
            `
            UPDATE tags_store_orders
            SET
                order_status = ?,
                payment_status = ?,
                stock_reserved = ?,
                updated_at = NOW()
            WHERE id = ?
            AND store_id = ?
            `,
            [
                nextOrderStatus,
                nextPaymentStatus,
                nextStockReserved,
                order.id,
                store.id
            ]
        );

        await conn.commit();

        return Response.json({
            ok: true,
            message: "Estado actualizado correctamente"
        });

    } catch (err) {
        await conn.rollback();

        console.error(
            "STORE ORDER STATUS ERROR:",
            err
        );

        return Response.json(
            { error: err.message || "Error actualizando pedido" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}
