// =====================================
// API: /api/store/public/reviews/validate
//
// Descripción:
// Valida una compra real de Tags Tienda
// y genera un token para calificar
// la experiencia en Tags Reviews.
//
// Contexto:
// store + client_reviews
// =====================================

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

import crypto
    from "crypto";

import { db }
    from "@/app/lib/tags-db";

function clean(value) {
    return String(value || "")
        .trim();
}

function normalizeContact(value) {
    return clean(value)
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/-/g, "")
        .replace(/\(/g, "")
        .replace(/\)/g, "");
}

function createToken() {
    return crypto
        .randomBytes(32)
        .toString("hex");
}

async function getPublishedReviewsPageSlug(businessId) {
    const [rows] =
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
                businessId
            ]
        );

    return rows?.[0]?.slug || null;
}

function buildReviewUrl(slug, token) {
    return `/p/${slug}?token=${token}`;
}

export async function POST(req) {
    try {
        const body =
            await req.json();

        const storeId =
            body.storeId;

        const orderNumber =
            clean(body.orderNumber);

        const contact =
            normalizeContact(body.contact);

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

        if (!orderNumber) {
            return Response.json(
                {
                    error:
                        "Ingresá el número de pedido"
                },
                {
                    status: 400
                }
            );
        }

        if (!contact) {
            return Response.json(
                {
                    error:
                        "Ingresá email o teléfono"
                },
                {
                    status: 400
                }
            );
        }


        const [orders] =
            await db.query(
                `
                SELECT
                    o.id,
                    o.store_id,
                    o.order_number,
                    o.customer_name,
                    o.customer_email,
                    o.customer_phone,
                    o.order_status,
                    o.payment_status,
                    o.created_at,
                    s.business_id
                FROM tags_store_orders o

                INNER JOIN tags_stores s
                    ON s.id = o.store_id

                WHERE o.store_id = ?
                AND o.order_number = ?
                AND o.order_status <> 'cancelled'
                LIMIT 1
                `,
                [
                    storeId,
                    orderNumber
                ]
            );

        const order =
            orders?.[0];



        if (!order) {
            return Response.json(
                {
                    error:
                        "No encontramos una compra con esos datos."
                },
                {
                    status: 404
                }
            );
        }

        /* Valida si ya Existe Reseña para esta compra */
        const [alreadyReviewedRows] =
            await db.query(
                `
        SELECT id
        FROM tags_client_review_responses
        WHERE store_id = ?
        AND order_id = ?
        AND verified_purchase = 1
        LIMIT 1
        `,
                [
                    storeId,
                    order.id
                ]
            );

        if (alreadyReviewedRows.length > 0) {
            return Response.json(
                {
                    error:
                        "Ya existe una valoración para este pedido."
                },
                {
                    status: 409
                }
            );
        }

        const email =
            normalizeContact(
                order.customer_email
            );

        const phone =
            normalizeContact(
                order.customer_phone
            );

        const matchesContact =
            (
                email &&
                contact === email
            ) ||
            (
                phone &&
                contact === phone
            ) ||
            (
                phone &&
                phone.endsWith(contact)
            ) ||
            (
                phone &&
                contact.endsWith(phone)
            );

        if (!matchesContact) {
            return Response.json(
                {
                    error:
                        "El email o teléfono no coincide con el pedido."
                },
                {
                    status: 403
                }
            );
        }

        const reviewSlug =
            await getPublishedReviewsPageSlug(
                order.business_id
            );

        if (!reviewSlug) {
            return Response.json(
                {
                    error:
                        "La página de reseñas no está publicada todavía."
                },
                {
                    status: 404
                }
            );
        }

        const [existingTokens] =
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
                    storeId,
                    order.id
                ]
            );

        if (existingTokens.length > 0) {
            const existingToken =
                existingTokens[0].token;

            return Response.json({
                ok: true,
                verified: true,
                token:
                    existingToken,
                reviewUrl:
                    buildReviewUrl(
                        reviewSlug,
                        existingToken
                    ),
                order: {
                    id:
                        order.id,
                    order_number:
                        order.order_number,
                    customer_name:
                        order.customer_name
                }
            });
        }

        const token =
            createToken();

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
                storeId,
                order.id,
                token,
                order.customer_name,
                order.customer_email,
                order.customer_phone
            ]
        );

        return Response.json({
            ok: true,
            verified: true,
            token,
            reviewUrl:
                buildReviewUrl(
                    reviewSlug,
                    token
                ),
            order: {
                id:
                    order.id,
                order_number:
                    order.order_number,
                customer_name:
                    order.customer_name
            }
        });

    } catch (err) {
        console.error(
            "STORE REVIEW VALIDATE ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    "Error verificando la compra"
            },
            {
                status: 500
            }
        );
    }
}