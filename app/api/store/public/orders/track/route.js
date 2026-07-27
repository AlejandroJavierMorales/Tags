// =====================================
// API: /api/store/public/orders/track
// Descripción: Consulta pública de seguimiento de pedido.
// Uso: Tags Tienda pública / seguimiento de pedidos.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
    checkStorePublicRateLimit,
    storeRequestIp
} from "@/app/modules/store/lib/storePublicRateLimit";

function clean(value) {
    return String(value || "").trim();
}

function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
}

function buildTrackingUrl(order) {
    if (order.tracking_url) {
        return order.tracking_url;
    }

    if (
        order.tracking_url_template &&
        order.tracking_code
    ) {
        return String(order.tracking_url_template)
            .replace("{code}", order.tracking_code);
    }

    return null;
}

export async function POST(req) {
    try {
        const body = await req.json();

        const {
            slug,
            orderNumber,
            contact
        } = body;

        if (!slug || !orderNumber || !contact) {
            return Response.json(
                {
                    error: "Completá número de pedido y email o teléfono."
                },
                {
                    status: 400
                }
            );
        }

        const cleanOrder = clean(orderNumber);
        const cleanContact = clean(contact);
        const contactDigits = onlyDigits(cleanContact);
        const isEmail =
            cleanContact.includes("@");

        if (
            !isEmail &&
            contactDigits.length < 6
        ) {
            return Response.json(
                {
                    error:
                        "Ingresá un email o teléfono válido."
                },
                { status: 400 }
            );
        }

        const rateLimit =
            checkStorePublicRateLimit({
                key:
                    `tracking:${slug}:${storeRequestIp(req)}`,
                limit: 15
            });

        if (!rateLimit.allowed) {
            return Response.json(
                {
                    error:
                        "Demasiados intentos. Probá nuevamente más tarde."
                },
                {
                    status: 429,
                    headers: {
                        "Retry-After":
                            String(
                                rateLimit.retryAfter
                            )
                    }
                }
            );
        }

        const [rows] = await db.query(
            `
            SELECT
                o.id,
                o.order_number,
                o.customer_email,
                o.customer_phone,
                o.subtotal,
                o.discount_total,
                o.shipping_total,
                o.total,
                o.payment_method,
                o.payment_status,
                o.order_status,
                o.shipping_method_name,
                o.carrier_name,
                o.shipping_status,
                o.tracking_code,
                o.tracking_url,
                o.created_at,

                s.name AS store_name,
                s.slug AS store_slug,
                s.logo_url AS store_logo_url,
                s.currency,

                c.tracking_url_template

            FROM tags_store_orders o

            INNER JOIN tags_stores s
                ON s.id = o.store_id

            LEFT JOIN tags_store_carriers c
                ON c.id = o.carrier_id
                AND c.store_id = o.store_id

            WHERE s.slug = ?
            AND o.order_number = ?
            AND (
                LOWER(o.customer_email) = LOWER(?)
                OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(o.customer_phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?
            )
            LIMIT 1
            `,
            [
                slug,
                cleanOrder,
                cleanContact,
                contactDigits
            ]
        );

        const order = rows[0];

        if (!order) {
            return Response.json(
                {
                    error: "No encontramos un pedido con esos datos."
                },
                {
                    status: 404
                }
            );
        }

        const [items] = await db.query(
            `
            SELECT
                id,
                title,
                variant_title,
                sku,
                quantity,
                unit_price,
                total_price
            FROM tags_store_order_items
            WHERE order_id = ?
            ORDER BY id ASC
            `,
            [
                order.id
            ]
        );

        return Response.json({
            ok: true,

            store: {
                name: order.store_name,
                slug: order.store_slug,
                logo_url: order.store_logo_url
            },

            order: {
                order_number: order.order_number,
                store_name: order.store_name,
                created_at: order.created_at,

                order_status: order.order_status,
                payment_status: order.payment_status,
                payment_method: order.payment_method,

                shipping_method_name: order.shipping_method_name,
                carrier_name: order.carrier_name,
                shipping_status: order.shipping_status,
                tracking_code: order.tracking_code,
                tracking_url: buildTrackingUrl(order),

                subtotal: order.subtotal,
                discount_total: order.discount_total,
                shipping_total: order.shipping_total,
                total: order.total,
                currency: order.currency || "ARS"
            },

            items
        });

    } catch (err) {
        console.error(
            "STORE PUBLIC ORDER TRACK ERROR:",
            err
        );

        return Response.json(
            {
                error: "Error consultando pedido."
            },
            {
                status: 500
            }
        );
    }
}
