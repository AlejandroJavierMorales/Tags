// =====================================
// API:
// /api/store/public/reviews/get/route.js
//
// Descripción:
// Valida el token público de calificación
// de un pedido entregado y devuelve los
// productos comprados junto con las
// calificaciones ya registradas.
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

export async function GET(req) {

    try {

        const {
            searchParams
        } = new URL(req.url);

        const token =
            clean(
                searchParams.get("token")
            );

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
                    o.review_token,
                    o.created_at,

                    s.business_id,
                    s.name AS store_name,
                    s.slug AS store_slug,
                    s.logo_url AS store_logo_url,
                    s.description AS store_description

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

        const [itemRows] =
            await db.query(
                `
                SELECT
                    oi.id AS order_item_id,
                    oi.product_id,
                    oi.variant_id,
                    oi.title,
                    oi.variant_title,
                    oi.quantity,
                    oi.unit_price,
                    oi.total_price,

                    p.slug AS product_slug,
                    p.is_visible AS product_is_visible,
                    p.status AS product_status,

                    img.image_url

                FROM tags_store_order_items oi

                LEFT JOIN tags_store_products p
                    ON p.id = oi.product_id

                LEFT JOIN tags_store_product_images img
                    ON img.product_id = oi.product_id
                    AND img.is_primary = 1

                WHERE oi.order_id = ?

                ORDER BY oi.id ASC
                `,
                [
                    order.id
                ]
            );

        const productIds =
            itemRows
                .map(item =>
                    Number(
                        item.product_id
                    )
                )
                .filter(Boolean);

        let reviewRows = [];

        if (productIds.length) {

            const placeholders =
                productIds
                    .map(() => "?")
                    .join(", ");

            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        source_item_id,
                        item_id,
                        rating,
                        title,
                        comment,
                        status,
                        is_verified,
                        created_at

                    FROM tags_commerce_item_reviews

                    WHERE business_id = ?
                    AND source_type = 'store_order'
                    AND source_id = ?
                    AND item_type = 'store_product'
                    AND item_id IN (${placeholders})

                    ORDER BY id ASC
                    `,
                    [
                        order.business_id,
                        order.id,
                        ...productIds
                    ]
                );

            reviewRows =
                rows || [];

        }

        const reviewsByProduct =
            new Map(
                reviewRows.map(review => [
                    Number(
                        review.item_id
                    ),
                    review
                ])
            );

        const items =
            itemRows.map(item => ({
                order_item_id:
                    item.order_item_id,

                product_id:
                    item.product_id,

                variant_id:
                    item.variant_id,

                title:
                    item.title,

                variant_title:
                    item.variant_title,

                quantity:
                    Number(
                        item.quantity || 1
                    ),

                image_url:
                    item.image_url || null,

                product_url:
                    item.product_id
                        ? `/p/${order.store_slug}/products/${item.product_id}`
                        : null,

                review:
                    reviewsByProduct.get(
                        Number(
                            item.product_id
                        )
                    ) || null
            }));

        return Response.json({
            ok: true,

            store: {
                id:
                    order.store_id,

                business_id:
                    order.business_id,

                name:
                    order.store_name,

                slug:
                    order.store_slug,

                logo_url:
                    order.store_logo_url,

                description:
                    order.store_description
            },

            order: {
                id:
                    order.id,

                order_number:
                    order.order_number,

                customer_name:
                    order.customer_name,

                created_at:
                    order.created_at
            },

            items
        });

    } catch (err) {

        console.error(
            "STORE PUBLIC REVIEWS GET ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error obteniendo los productos para calificar"
            },
            {
                status: 500
            }
        );

    }

}