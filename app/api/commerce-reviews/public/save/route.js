// =====================================
// API:
// /api/commerce-reviews/public/save
//
// Descripción:
// Guarda o actualiza una calificación
// verificada de un ítem adquirido en
// una operación entregada.
//
// Contexto:
// commerce-reviews
// =====================================

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

import { db }
    from "@/app/lib/tags-db";

function clean(value) {

    return String(
        value || ""
    ).trim();

}

function normalizeRating(value) {

    const rating =
        Number(value);

    if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {
        return null;
    }

    return rating;

}

export async function POST(req) {

    const conn =
        await db.getConnection();

    try {

        const body =
            await req.json();

        const token =
            clean(
                body.token
            );

        const productId =
            Number(
                body.productId
            );

        const orderItemId =
            Number(
                body.orderItemId
            );

        const rating =
            normalizeRating(
                body.rating
            );

        const title =
            clean(
                body.title
            ) || null;

        const comment =
            clean(
                body.comment
            ) || null;

        if (!token) {
            return Response.json(
                {
                    ok: false,
                    error: "INVALID_TOKEN",
                    message: "Token requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!productId) {
            return Response.json(
                {
                    ok: false,
                    error: "ITEM_NOT_FOUND",
                    message: "Producto requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!orderItemId) {
            return Response.json(
                {
                    ok: false,
                    error: "SOURCE_ITEM_NOT_FOUND",
                    message: "Ítem del pedido requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!rating) {
            return Response.json(
                {
                    ok: false,
                    error: "INVALID_RATING",
                    message:
                        "La calificación debe ser un número entero entre 1 y 5"
                },
                {
                    status: 400
                }
            );
        }

        await conn.beginTransaction();

        const [orderRows] =
            await conn.query(
                `
                SELECT
                    o.id,
                    o.store_id,
                    o.order_number,
                    o.customer_name,
                    o.customer_email,
                    o.shipping_status,
                    s.business_id

                FROM tags_store_orders o

                INNER JOIN tags_stores s
                    ON s.id = o.store_id

                WHERE o.review_token = ?

                LIMIT 1

                FOR UPDATE
                `,
                [
                    token
                ]
            );

        const order =
            orderRows?.[0];

        if (!order) {

            await conn.rollback();

            return Response.json(
                {
                    ok: false,
                    error: "INVALID_TOKEN",
                    message:
                        "El enlace de calificación no es válido"
                },
                {
                    status: 404
                }
            );

        }

        if (
            order.shipping_status !== "delivered"
        ) {

            await conn.rollback();

            return Response.json(
                {
                    ok: false,
                    error: "ORDER_NOT_DELIVERED",
                    message:
                        "El pedido todavía no fue marcado como entregado"
                },
                {
                    status: 403
                }
            );

        }

        const [itemRows] =
            await conn.query(
                `
                SELECT
                    oi.id,
                    oi.order_id,
                    oi.product_id,
                    oi.variant_id,
                    oi.title,
                    oi.variant_title

                FROM tags_store_order_items oi

                WHERE oi.id = ?
                AND oi.order_id = ?
                AND oi.product_id = ?

                LIMIT 1
                `,
                [
                    orderItemId,
                    order.id,
                    productId
                ]
            );

        const orderItem =
            itemRows?.[0];

        if (!orderItem) {

            await conn.rollback();

            return Response.json(
                {
                    ok: false,
                    error: "ITEM_NOT_IN_ORDER",
                    message:
                        "El producto no pertenece a este pedido"
                },
                {
                    status: 403
                }
            );

        }

        const [existingRows] =
            await conn.query(
                `
                SELECT
                    id

                FROM tags_commerce_item_reviews

                WHERE business_id = ?
                AND source_type = 'store_order'
                AND source_id = ?
                AND item_type = 'store_product'
                AND item_id = ?

                LIMIT 1

                FOR UPDATE
                `,
                [
                    order.business_id,
                    order.id,
                    productId
                ]
            );

        const existingReview =
            existingRows?.[0];

        let reviewId;

        if (existingReview) {

            reviewId =
                existingReview.id;

            await conn.query(
                `
                UPDATE tags_commerce_item_reviews

                SET
                    source_item_id = ?,
                    customer_name = ?,
                    customer_email = ?,
                    rating = ?,
                    title = ?,
                    comment = ?,
                    status = 'pending',
                    is_verified = 1,
                    updated_at = NOW()

                WHERE id = ?
                AND business_id = ?
                `,
                [
                    orderItem.id,
                    clean(
                        order.customer_name
                    ) || null,
                    clean(
                        order.customer_email
                    ) || null,
                    rating,
                    title,
                    comment,
                    reviewId,
                    order.business_id
                ]
            );

        } else {

            const [result] =
                await conn.query(
                    `
                    INSERT INTO tags_commerce_item_reviews (
                        business_id,
                        source_type,
                        source_id,
                        source_item_id,
                        item_type,
                        item_id,
                        customer_name,
                        customer_email,
                        rating,
                        title,
                        comment,
                        status,
                        is_verified,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        ?,
                        'store_order',
                        ?,
                        ?,
                        'store_product',
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'pending',
                        1,
                        NOW(),
                        NOW()
                    )
                    `,
                    [
                        order.business_id,
                        order.id,
                        orderItem.id,
                        productId,
                        clean(
                            order.customer_name
                        ) || null,
                        clean(
                            order.customer_email
                        ) || null,
                        rating,
                        title,
                        comment
                    ]
                );

            reviewId =
                result.insertId;

        }

        await conn.commit();

        return Response.json({
            ok: true,

            message:
                existingReview
                    ? "Calificación actualizada correctamente"
                    : "Calificación guardada correctamente",

            reviewId,

            review: {
                id:
                    reviewId,

                source_type:
                    "store_order",

                source_id:
                    order.id,

                source_item_id:
                    orderItem.id,

                item_type:
                    "store_product",

                item_id:
                    productId,

                rating,

                title,

                comment,

                status:
                    "pending",

                is_verified:
                    1
            }
        });

    } catch (err) {

        try {
            await conn.rollback();
        } catch {
            // La transacción puede no haberse iniciado.
        }

        console.error(
            "COMMERCE REVIEWS PUBLIC SAVE ERROR:",
            err
        );

        return Response.json(
            {
                ok: false,
                error: "INTERNAL_ERROR",
                message:
                    err.message ||
                    "Error guardando la calificación"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }

}