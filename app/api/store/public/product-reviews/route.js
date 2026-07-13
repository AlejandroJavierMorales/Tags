// =====================================
// API:
// /api/store/public/product-reviews/validate
//
// Descripción:
// Verifica que un pedido pertenezca a la
// tienda y al cliente, comprueba que esté
// entregado, genera o reutiliza el token
// de Commerce Reviews y devuelve la URL
// pública para calificar sus productos.
//
// No modifica el circuito existente de
// Tags Reviews.
//
// Contexto:
// store / commerce-reviews
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

    return String(
        value || ""
    ).trim();

}

function normalizePhone(value) {

    return clean(value)
        .replace(/\D/g, "");

}

function createReviewToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");

}

async function createUniqueReviewToken(
    conn
) {

    for (
        let attempt = 0;
        attempt < 5;
        attempt++
    ) {

        const token =
            createReviewToken();

        const [rows] =
            await conn.query(
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
        "No se pudo generar el acceso de calificación"
    );

}

export async function POST(req) {

    const conn =
        await db.getConnection();

    let transactionStarted =
        false;

    try {

        const body =
            await req.json();

        const storeId =
            Number(
                body.storeId
            );

        const orderNumber =
            clean(
                body.orderNumber
            );

        const contact =
            clean(
                body.contact
            );

        if (!storeId) {
            return Response.json(
                {
                    error:
                        "Tienda requerida"
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
                        "Número de pedido requerido"
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
                        "Email o teléfono requerido"
                },
                {
                    status: 400
                }
            );
        }

        await conn.beginTransaction();

        transactionStarted =
            true;

        const [orderRows] =
            await conn.query(
                `
                SELECT
                    o.id,
                    o.store_id,
                    o.order_number,
                    o.customer_email,
                    o.customer_phone,
                    o.shipping_status,
                    o.review_token,

                    s.slug,
                    s.status AS store_status,

                    qrp.status AS page_status,
                    qrp.page_type

                FROM tags_store_orders o

                INNER JOIN tags_stores s
                    ON s.id = o.store_id

                INNER JOIN tags_qr_pages qrp
                    ON qrp.id = s.page_id

                WHERE o.store_id = ?
                AND o.order_number = ?

                LIMIT 1

                FOR UPDATE
                `,
                [
                    storeId,
                    orderNumber
                ]
            );

        const order =
            orderRows?.[0];

        if (!order) {

            await conn.rollback();

            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        "No encontramos un pedido con esos datos."
                },
                {
                    status: 404
                }
            );

        }

        const normalizedContactPhone =
            normalizePhone(
                contact
            );

        const normalizedOrderPhone =
            normalizePhone(
                order.customer_phone
            );

        const emailMatches =
            Boolean(
                order.customer_email &&
                clean(
                    order.customer_email
                ).toLowerCase() ===
                contact.toLowerCase()
            );

        const phoneMatches =
            Boolean(
                normalizedContactPhone &&
                normalizedOrderPhone &&
                normalizedContactPhone ===
                normalizedOrderPhone
            );

        if (
            !emailMatches &&
            !phoneMatches
        ) {

            await conn.rollback();

            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        "El email o teléfono no coincide con el utilizado en la compra."
                },
                {
                    status: 403
                }
            );

        }

        if (
            order.shipping_status !==
            "delivered"
        ) {

            await conn.rollback();

            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        "El pedido todavía no fue marcado como entregado."
                },
                {
                    status: 403
                }
            );

        }

        if (
            order.store_status !==
                "published" ||
            order.page_status !==
                "published" ||
            order.page_type !==
                "store"
        ) {

            await conn.rollback();

            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        "La tienda no está disponible actualmente."
                },
                {
                    status: 404
                }
            );

        }

        const [itemRows] =
            await conn.query(
                `
                SELECT id
                FROM tags_store_order_items
                WHERE order_id = ?
                AND product_id IS NOT NULL
                LIMIT 1
                `,
                [
                    order.id
                ]
            );

        if (!itemRows.length) {

            await conn.rollback();

            transactionStarted =
                false;

            return Response.json(
                {
                    error:
                        "Este pedido no contiene productos que puedan calificarse."
                },
                {
                    status: 404
                }
            );

        }

        let reviewToken =
            clean(
                order.review_token
            );

        if (!reviewToken) {

            reviewToken =
                await createUniqueReviewToken(
                    conn
                );

            await conn.query(
                `
                UPDATE tags_store_orders
                SET
                    review_token = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND store_id = ?
                `,
                [
                    reviewToken,
                    order.id,
                    storeId
                ]
            );

        }

        await conn.commit();

        transactionStarted =
            false;

        return Response.json({
            ok: true,

            orderId:
                order.id,

            reviewUrl:
                `/p/${order.slug}/reviews/${reviewToken}`
        });

    } catch (error) {

        if (transactionStarted) {

            try {
                await conn.rollback();
            } catch {
                // No reemplazar el error original.
            }

        }

        console.error(
            "STORE PRODUCT REVIEWS VALIDATE ERROR:",
            error
        );

        return Response.json(
            {
                error:
                    error.message ||
                    "Error verificando la compra"
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }

}