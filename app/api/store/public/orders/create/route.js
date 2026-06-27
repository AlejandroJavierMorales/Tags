// =====================================
// API: /api/store/public/orders/create
// Descripción: Crea un pedido público de Tags Tienda desde el carrito.
// Uso: Checkout público por WhatsApp / Mercado Pago / transferencia / efectivo.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { sendStoreOrderEmail } from "@/app/modules/store/lib/sendStoreOrderEmail";
import {
    getReservedStockForProduct,
    getReservedStockForVariant
}
    from "@/app/modules/store/lib/updateOrderStock";

function safe(value) {
    return value === undefined || value === ""
        ? null
        : value;
}

function generateOrderNumber(storeId) {
    const timestamp =
        Date.now()
            .toString()
            .slice(-8);

    return `ST${storeId}-${timestamp}`;
}

function normalizePaymentMethod(value) {
    if (value === "manual_transfer") {
        return "transfer";
    }

    return value || "whatsapp";
}

export async function POST(req) {
    const conn =
        await db.getConnection();

    try {
        const body =
            await req.json();

        const {
            storeId,
            items,
            customer = {},
            notes,
            coupon = null,
            shippingMethod = null,
            shippingQuote = null,
            paymentMethod = "whatsapp"
        } = body;

        if (!storeId) {
            return Response.json(
                { error: "storeId es requerido" },
                { status: 400 }
            );
        }

        if (!Array.isArray(items) || !items.length) {
            return Response.json(
                { error: "El carrito está vacío" },
                { status: 400 }
            );
        }

        const finalPaymentMethod =
            normalizePaymentMethod(paymentMethod);

        const validPaymentMethods = [
            "whatsapp",
            "mercado_pago",
            "cash",
            "transfer"
        ];

        if (!validPaymentMethods.includes(finalPaymentMethod)) {
            return Response.json(
                { error: "Medio de pago inválido" },
                { status: 400 }
            );
        }

        const [storeRows] =
            await conn.query(
                `
                SELECT *
                FROM tags_stores
                WHERE id = ?
                AND status = 'published'
                LIMIT 1
                `,
                [storeId]
            );

        const store =
            storeRows[0];

        if (!store) {
            return Response.json(
                { error: "Tienda no encontrada" },
                { status: 404 }
            );
        }

        const subtotal =
            items.reduce(
                (acc, item) =>
                    acc + Number(item.total_price || 0),
                0
            );

        let couponId =
            null;

        let couponCode =
            null;

        let discountTotal =
            0;

        if (coupon?.id && coupon?.code) {
            const [couponRows] =
                await conn.query(
                    `
                    SELECT *
                    FROM tags_store_coupons
                    WHERE id = ?
                    AND store_id = ?
                    AND UPPER(code) = ?
                    AND is_active = 1
                    LIMIT 1
                    `,
                    [
                        coupon.id,
                        storeId,
                        String(coupon.code || "").toUpperCase()
                    ]
                );

            const dbCoupon =
                couponRows[0];

            if (!dbCoupon) {
                return Response.json(
                    { error: "Cupón inválido" },
                    { status: 400 }
                );
            }

            if (
                dbCoupon.max_uses !== null &&
                dbCoupon.max_uses !== undefined &&
                Number(dbCoupon.used_count || 0) >= Number(dbCoupon.max_uses)
            ) {
                return Response.json(
                    { error: "Este cupón ya alcanzó su límite de usos" },
                    { status: 400 }
                );
            }

            const value =
                Number(dbCoupon.discount_value || 0);

            if (dbCoupon.discount_type === "percent") {
                discountTotal =
                    Math.round(
                        subtotal * (value / 100)
                    );
            } else {
                discountTotal =
                    Math.min(
                        value,
                        subtotal
                    );
            }

            couponId =
                dbCoupon.id;

            couponCode =
                dbCoupon.code;
        }

        let shippingMethodId = null;

        let shippingMethodName = null;

        let shippingTotal = 0;

        let carrierId = null;

        let carrierName = null;

        let shippingQuoteJson = null;

        /* Si estoy Cutizando con Zipnova */
        if (shippingQuote?.provider === "zipnova") {

            shippingMethodId = null;

            shippingMethodName =
                `${shippingQuote.carrier_name || "Zipnova"} - ${shippingQuote.service_name || "Envío"}`;

            shippingTotal =
                Number(shippingQuote.price || 0);

            carrierId =
                shippingQuote.carrier_id || null;

            carrierName =
                shippingQuote.carrier_name || "Zipnova";

            shippingQuoteJson =
                JSON.stringify({

                    provider:
                        shippingQuote.provider,

                    carrier_id:
                        shippingQuote.carrier_id,

                    carrier_name:
                        shippingQuote.carrier_name,

                    service_type_id:
                        shippingQuote.service_type_id,

                    service_code:
                        shippingQuote.service_code,

                    service_name:
                        shippingQuote.service_name,

                    logistic_type:
                        shippingQuote.logistic_type,

                    price:
                        shippingQuote.price,

                    estimated_delivery:
                        shippingQuote.estimated_delivery

                });
        }

        if (!shippingQuoteJson && shippingMethod?.id) {
            const [shippingRows] =
                await conn.query(
                    `
                    SELECT
                        sm.*,
                        c.name AS carrier_name
                    FROM tags_store_shipping_methods sm
                    LEFT JOIN tags_store_carriers c
                        ON c.id = sm.carrier_id
                        AND c.store_id = sm.store_id
                    WHERE sm.id = ?
                    AND sm.store_id = ?
                    AND sm.is_active = 1
                    LIMIT 1
                    `,
                    [
                        shippingMethod.id,
                        storeId
                    ]
                );

            const dbShipping =
                shippingRows[0];

            if (!dbShipping) {
                return Response.json(
                    { error: "Método de envío inválido" },
                    { status: 400 }
                );
            }

            shippingMethodId =
                dbShipping.id;

            shippingMethodName =
                dbShipping.name;

            shippingTotal =
                Number(dbShipping.price || 0);

            if (
                dbShipping.free_from &&
                subtotal >= Number(dbShipping.free_from)
            ) {
                shippingTotal = 0;
            }

            carrierId =
                dbShipping.carrier_id || null;

            carrierName =
                dbShipping.carrier_name || null;
        }

        const total =
            Math.max(
                0,
                subtotal - discountTotal + shippingTotal
            );

        const orderNumber =
            generateOrderNumber(storeId);

        // =====================================
        // VALIDAR STOCK DISPONIBLE
        // Modelo: stock real - reservas pendientes
        // =====================================

        for (const item of items) {

            const quantity =
                Number(item.quantity || 1);

            if (quantity <= 0) {
                return Response.json(
                    {
                        error:
                            "Cantidad inválida"
                    },
                    {
                        status: 400
                    }
                );
            }

            // -----------------------------
            // VARIANTE
            // -----------------------------
            if (item.variant_id) {

                const [variantRows] =
                    await conn.query(
                        `
                SELECT
                    v.id,
                    v.stock_qty,
                    v.title AS variant_title,
                    p.title AS product_title
                FROM tags_store_variants v

                INNER JOIN tags_store_products p
                    ON p.id = v.product_id

                WHERE v.id = ?
                LIMIT 1
                `,
                        [
                            item.variant_id
                        ]
                    );

                const variant =
                    variantRows[0];

                if (!variant) {
                    return Response.json(
                        {
                            error:
                                "Variante inexistente"
                        },
                        {
                            status: 400
                        }
                    );
                }

                const reservedQty =
                    await getReservedStockForVariant(
                        conn,
                        item.variant_id
                    );

                const availableQty =
                    Number(variant.stock_qty || 0) -
                    reservedQty;

                if (availableQty < quantity) {
                    return Response.json(
                        {
                            error:
                                `Stock insuficiente para ${variant.product_title} ${variant.variant_title || ""}. Disponible: ${availableQty}`
                        },
                        {
                            status: 400
                        }
                    );
                }

                continue;
            }

            // -----------------------------
            // PRODUCTO SIMPLE
            // -----------------------------
            const [productRows] =
                await conn.query(
                    `
            SELECT
                id,
                title,
                stock_enabled,
                stock_qty
            FROM tags_store_products
            WHERE id = ?
            LIMIT 1
            `,
                    [
                        item.product_id
                    ]
                );

            const product =
                productRows[0];

            if (!product) {
                return Response.json(
                    {
                        error:
                            "Producto inexistente"
                    },
                    {
                        status: 400
                    }
                );
            }

            if (Number(product.stock_enabled) === 1) {

                const reservedQty =
                    await getReservedStockForProduct(
                        conn,
                        item.product_id
                    );

                const availableQty =
                    Number(product.stock_qty || 0) -
                    reservedQty;

                if (availableQty < quantity) {
                    return Response.json(
                        {
                            error:
                                `Stock insuficiente para ${product.title}. Disponible: ${availableQty}`
                        },
                        {
                            status: 400
                        }
                    );
                }
            }
        }

        await conn.beginTransaction();

        const [orderResult] =
            await conn.query(
                `
        INSERT INTO tags_store_orders (
            store_id,
            order_number,
            customer_name,
            customer_email,
            customer_phone,
            customer_address,
            customer_zip,
            notes,
            coupon_id,
            coupon_code,
            subtotal,
            discount_total,
            shipping_total,
            shipping_method_id,
            shipping_method_name,
            carrier_id,
            carrier_name,
            shipping_quote_json,
            total,
            payment_method,
            payment_status,
            order_status,
            shipping_status,
            stock_reserved,
            source,
            metadata_json,
            created_at,
            updated_at
        )
        VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            NOW(),
            NOW()
        )
        `,
                [
                    storeId,
                    orderNumber,
                    safe(customer.name),
                    safe(customer.email),
                    safe(customer.phone),
                    safe(customer.address),
                    safe(customer.zip),
                    safe(notes),

                    couponId,
                    couponCode,

                    subtotal,
                    discountTotal,
                    shippingTotal,
                    shippingMethodId,
                    shippingMethodName,
                    carrierId,
                    carrierName,
                    shippingQuoteJson,

                    total,
                    finalPaymentMethod,
                    "pending",
                    "new",
                    "pending",
                    1,
                    "store",
                    JSON.stringify({

                        source: "public_store",

                        checkout: finalPaymentMethod,

                        whatsapp_checkout:
                            finalPaymentMethod === "whatsapp",

                        shipping: {

                            zip:
                                safe(customer.zip),

                            city:
                                safe(customer.city),

                            state:
                                safe(customer.state),

                            street:
                                safe(customer.address),

                            street_number:
                                safe(customer.street_number),

                            street_extras:
                                safe(customer.street_extras),

                            document:
                                safe(customer.document)
                        },

                        quote:
                            shippingQuote || null

                    })
                ]
            );

        const orderId =
            orderResult.insertId;

        for (const item of items) {
            await conn.query(
                `
        INSERT INTO tags_store_order_items (
            order_id,
            product_id,
            variant_id,
            title,
            variant_title,
            sku,
            quantity,
            unit_price,
            total_price,
            options_json,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
                [
                    orderId,
                    item.product_id,
                    safe(item.variant_id),
                    item.product_title,
                    safe(item.variant_title),
                    safe(item.sku),
                    Number(item.quantity || 1),
                    Number(item.unit_price || 0),
                    Number(item.total_price || 0),
                    JSON.stringify(item.options || {})
                ]
            );
        }

        await conn.commit();

        if (customer.email) {

            try {

                const emailResult = await sendStoreOrderEmail({
                    store,
                    order: {
                        order_number: orderNumber,
                        customer_name: customer.name,
                        customer_email: customer.email,
                        total
                    },
                    items,
                    type: "order_created"
                });

                console.log(
                    "STORE EMAIL RESULT:",
                    emailResult
                );

            } catch (err) {

                console.error(
                    "STORE EMAIL ERROR:",
                    err
                );
            }
        }

        return Response.json({
            ok: true,
            orderId,
            orderNumber,
            subtotal,
            discountTotal,
            shippingTotal,
            total,
            couponCode,
            shippingMethodName,
            carrierId,
            carrierName,
            paymentMethod: finalPaymentMethod
        });

    } catch (err) {
        await conn.rollback();

        console.error(
            "STORE PUBLIC ORDER CREATE ERROR:",
            err
        );

        return Response.json(
            { error: "Error creando pedido" },
            { status: 500 }
        );

    } finally {
        conn.release();
    }
}