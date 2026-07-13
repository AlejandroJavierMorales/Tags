// =====================================
// API:
// /api/store/public/reviews/save/route.js
//
// Descripción:
// Guarda o actualiza una calificación
// verificada de un producto comprado
// en un pedido entregado.
//
// Contexto:
// store
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
            body.orderItemId
                ? Number(
                    body.orderItemId
                )
                : null;

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
                    error:
                        "Token requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!productId) {
            return Response.json(
                {
                    error:
                        "Producto requerido"
                },
                {
                    status: 400
                }
            );
        }

        if (!rating) {
            return Response.json(
                {
                    error:
                        "La calificación debe ser un número entero entre 1 y 5"
                },
                {
                    status: 400
                }
            );
        }

        const [orderRows] =
            await db.query(
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
                AND o.shipping_status = 'delivered'

                LIMIT 1
                `,
                [
                    token
                ]
            );

        const order =
            orderRows?.[0];

        if (!order) {
            return Response.json(
                {
                    error:
                        "El enlace de calificación no es válido o el pedido todavía no fue entregado"
                },
                {
                    status: 404
                }
            );
        }

        const itemParams = [
            order.id,
            productId
        ];

        let itemWhere =
            `
            oi.order_id = ?
            AND oi.product_id = ?
            `;

        if (orderItemId) {
            itemWhere +=
                `
                AND oi.id = ?
                `;

            itemParams.push(
                orderItemId
            );
        }

        const [itemRows] =
            await db.query(
                `
                SELECT
                    oi.id,
                    oi.product_id,
                    oi.variant_id,
                    oi.title,
                    oi.variant_title

                FROM tags_store_order_items oi

                WHERE ${itemWhere}

                LIMIT 1
                `,
                itemParams
            );

        const orderItem =
            itemRows?.[0];

        if (!orderItem) {
            return Response.json(
                {
                    error:
                        "El producto no pertenece a este pedido"
                },
                {
                    status: 403
                }
            );
        }

        const [existingRows] =
            await db.query(
                `
                SELECT id
                FROM tags_commerce_item_reviews

                WHERE business_id = ?
                AND source_type = 'store_order'
                AND source_id = ?
                AND item_type = 'store_product'
                AND item_id = ?

                LIMIT 1
                `,
                [
                    order.business_id,
                    order.id,
                    productId
                ]
            );

        const existingReview =
            existingRows?.[0];

        if (existingReview) {

            await db.query(
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
                    existingReview.id
                ]
            );

            return Response.json({
                ok: true,
                message:
                    "Calificación actualizada correctamente",
                reviewId:
                    existingReview.id
            });

        }

        const [result] =
            await db.query(
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

        return Response.json({
            ok: true,
            message:
                "Calificación guardada correctamente",
            reviewId:
                result.insertId
        });

    } catch (err) {

        console.error(
            "STORE PUBLIC REVIEWS SAVE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error guardando la calificación"
            },
            {
                status: 500
            }
        );

    }

}