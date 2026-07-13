// =====================================
// API:
// /api/store/public/reviews/list
//
// Descripción:
// Devuelve reseñas públicas de experiencias,
// productos o ambas para mostrarlas en los
// bloques públicos de Tags Store.
//
// Solo incluye reseñas marcadas con
// is_public = 1.
//
// Contexto:
// store / reviews
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

function normalizeLimit(value) {

    const parsed =
        Number(value);

    if (
        !Number.isFinite(parsed)
    ) {
        return 10;
    }

    return Math.min(
        50,
        Math.max(
            1,
            Math.trunc(parsed)
        )
    );

}

function normalizeSource(value) {

    const allowedSources = [
        "both",
        "experience",
        "commerce"
    ];

    return allowedSources.includes(value)
        ? value
        : "both";

}

function normalizeOrder(value) {

    const allowedOrders = [
        "newest",
        "best_rating",
        "random"
    ];

    return allowedOrders.includes(value)
        ? value
        : "newest";

}

function getOrderSql(order) {

    if (
        order ===
        "best_rating"
    ) {
        return `
            ORDER BY
                normalized.rating DESC,
                normalized.created_at DESC,
                normalized.id DESC
        `;
    }

    if (
        order ===
        "random"
    ) {
        return `
            ORDER BY
                RAND()
        `;
    }

    return `
        ORDER BY
            normalized.created_at DESC,
            normalized.id DESC
    `;

}

export async function GET(req) {

    try {

        const {
            searchParams
        } = new URL(req.url);

        const storeId =
            Number(
                searchParams.get(
                    "storeId"
                )
            );

        const source =
            normalizeSource(
                clean(
                    searchParams.get(
                        "source"
                    )
                )
            );

        const order =
            normalizeOrder(
                clean(
                    searchParams.get(
                        "order"
                    )
                )
            );

        const limit =
            normalizeLimit(
                searchParams.get(
                    "limit"
                )
            );

        if (!storeId) {

            return Response.json(
                {
                    error:
                        "storeId requerido"
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
                    s.id,
                    s.business_id,
                    s.status,
                    s.page_id,

                    p.status AS page_status,
                    p.page_type

                FROM tags_stores s

                INNER JOIN tags_qr_pages p
                    ON p.id = s.page_id

                WHERE s.id = ?

                LIMIT 1
                `,
                [
                    storeId
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

        if (
            store.status !==
                "published" ||
            store.page_status !==
                "published" ||
            store.page_type !==
                "store"
        ) {

            return Response.json(
                {
                    error:
                        "La tienda no está disponible"
                },
                {
                    status: 404
                }
            );

        }

        const selects = [];
        const params = [];

        if (
            source === "both" ||
            source === "commerce"
        ) {

            selects.push(
                `
                SELECT
                    CONCAT(
                        'commerce-',
                        r.id
                    ) AS id,

                    'commerce' AS type,

                    r.rating AS rating,

                    r.title AS title,

                    r.comment AS comment,

                    r.customer_name AS customer_name,

                    COALESCE(
                        p.title,
                        oi.title,
                        NULL
                    ) AS product_name,

                    r.is_verified AS verified,

                    r.created_at AS created_at

                FROM tags_commerce_item_reviews r

                LEFT JOIN tags_store_products p
                    ON p.id = r.item_id

                LEFT JOIN tags_store_order_items oi
                    ON oi.id = r.source_item_id

                WHERE r.business_id = ?
                AND r.source_type = 'store_order'
                AND r.item_type = 'store_product'
                AND r.is_public = 1
                `
            );

            params.push(
                store.business_id
            );

        }

        if (
            source === "both" ||
            source === "experience"
        ) {

            selects.push(
                `
                SELECT
                    CONCAT(
                        'experience-',
                        r.id
                    ) AS id,

                    'experience' AS type,

                    r.average_rating AS rating,

                    NULL AS title,

                    r.general_comment AS comment,

                    r.customer_name AS customer_name,

                    NULL AS product_name,

                    r.verified_purchase AS verified,

                    r.created_at AS created_at

                FROM tags_client_review_responses r

                WHERE r.business_id = ?
                AND r.is_public = 1
                `
            );

            params.push(
                store.business_id
            );

        }

        if (!selects.length) {

            return Response.json({
                ok: true,
                data: []
            });

        }

        const orderSql =
            getOrderSql(
                order
            );

        const [rows] =
            await db.query(
                `
                SELECT
                    normalized.id,
                    normalized.type,
                    normalized.rating,
                    normalized.title,
                    normalized.comment,
                    normalized.customer_name,
                    normalized.product_name,
                    normalized.verified,
                    normalized.created_at

                FROM (
                    ${selects.join(`
                        UNION ALL
                    `)}
                ) normalized

                ${orderSql}

                LIMIT ${limit}
                `,
                params
            );

        const normalizedRows =
            rows.map(review => ({
                id:
                    review.id,

                type:
                    review.type,

                rating:
                    Number(
                        review.rating || 0
                    ),

                title:
                    review.title || null,

                comment:
                    review.comment || "",

                customer_name:
                    review.customer_name ||
                    "Cliente",

                product_name:
                    review.product_name ||
                    null,

                verified:
                    Number(
                        review.verified || 0
                    ) === 1,

                created_at:
                    review.created_at
            }));

        return Response.json({
            ok: true,
            data:
                normalizedRows
        });

    } catch (err) {

        console.error(
            "STORE PUBLIC REVIEWS LIST ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error listando reseñas públicas"
            },
            {
                status: 500
            }
        );

    }

}