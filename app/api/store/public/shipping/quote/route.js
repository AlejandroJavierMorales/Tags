export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
    signStoreShippingQuote
} from "@/app/modules/store/lib/storeShippingQuoteSignature";
import {
    checkStorePublicRateLimit,
    storeRequestIp
} from "@/app/modules/store/lib/storePublicRateLimit";

function safeNumber(value, fallback = 0) {
    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}

function buildBasicAuth(token, secret) {
    return Buffer
        .from(`${token}:${secret}`)
        .toString("base64");
}

function normalizeZipnovaQuotes(data) {
    const rawQuotes =
        Array.isArray(data?.all_results)
            ? data.all_results
            : [];

    return rawQuotes
        .filter(quote =>
            quote.selectable !== false
        )
        .map((quote, index) => ({
            id:
                quote.rate?.id ||
                `${quote.carrier?.id || "carrier"}_${quote.service_type?.id || index}`,

            provider:
                "zipnova",

            carrier_id:
                quote.carrier?.id || null,

            carrier_name:
                quote.carrier?.name || "Zipnova",

            carrier_logo:
                quote.carrier?.logo || null,

            service_type_id:
                quote.service_type?.id || null,

            service_code:
                quote.service_type?.code || null,

            service_name:
                quote.service_type?.name || "Envío",

            logistic_type:
                quote.logistic_type || null,

            price:
                safeNumber(
                    quote.amounts?.seller_price_incl_tax ||
                    quote.amounts?.price_incl_tax ||
                    quote.amounts?.seller_price ||
                    quote.amounts?.price,
                    0
                ),

            delivery_days_min:
                quote.delivery_time?.min || null,

            delivery_days_max:
                quote.delivery_time?.max || null,

            estimated_delivery:
                quote.delivery_time?.estimated_delivery || null,

            tags:
                quote.tags || [],

            pickup_points:
                quote.pickup_points || [],

            raw:
                quote
        }));
}

export async function POST(req) {
    try {
        const body =
            await req.json();

        const {
            storeId,
            zip,
            city,
            state,
            items = []
        } = body;

        if (!storeId) {
            return Response.json(
                { error: "storeId es requerido" },
                { status: 400 }
            );
        }

        if (!zip) {
            return Response.json(
                { error: "Código postal requerido" },
                { status: 400 }
            );
        }

        if (!Array.isArray(items) || !items.length) {
            return Response.json(
                { error: "El carrito está vacío" },
                { status: 400 }
            );
        }

        const [providerRows] =
            await db.query(
                `
                SELECT
                    account_id,
                    origin_id,
                    api_token,
                    api_secret
                FROM tags_store_shipping_provider_accounts
                WHERE store_id = ?
                AND provider = 'zipnova'
                AND is_active = 1
                AND is_connected = 1
                LIMIT 1
                `,
                [storeId]
            );

        const provider =
            providerRows[0];

        if (!provider) {
            return Response.json(
                { error: "Zipnova no está configurado para esta tienda" },
                { status: 400 }
            );
        }

        if (
            !provider.account_id ||
            !provider.origin_id ||
            !provider.api_token ||
            !provider.api_secret
        ) {
            return Response.json(
                { error: "Faltan credenciales Zipnova" },
                { status: 400 }
            );
        }

        const productIds =
            items
                .map(item => Number(item.product_id))
                .filter(Boolean);

        if (!productIds.length) {
            return Response.json(
                { error: "El carrito no contiene productos válidos" },
                { status: 400 }
            );
        }

        const rateLimit =
            checkStorePublicRateLimit({
                key:
                    `quote:${storeId}:${storeRequestIp(req)}`,
                limit: 20
            });

        if (!rateLimit.allowed) {
            return Response.json(
                {
                    error:
                        "Demasiadas cotizaciones. Intentá nuevamente en unos segundos."
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

        const [productRows] =
            await db.query(
                `
                SELECT
                    id,
                    sku,
                    title,
                    price,
                    sale_price,
                    weight_grams,
                    package_width_cm,
                    package_height_cm,
                    package_length_cm,
                    requires_shipping
                FROM tags_store_products
                WHERE store_id = ?
                AND id IN (${productIds.map(() => "?").join(",")})
                `,
                [
                    storeId,
                    ...productIds
                ]
            );

        const productsById =
            new Map(
                productRows.map(product => [
                    Number(product.id),
                    product
                ])
            );

        const quoteItems =
            [];

        let declaredValue =
            0;

        for (const item of items) {
            const product =
                productsById.get(
                    Number(item.product_id)
                );

            if (!product) {
                continue;
            }

            if (Number(product.requires_shipping) === 0) {
                continue;
            }

            const quantity =
                Math.max(
                    1,
                    safeNumber(item.quantity, 1)
                );

            const unitPrice =
                safeNumber(
                    product.sale_price || product.price,
                    0
                );

            declaredValue +=
                unitPrice * quantity;

            for (let i = 0; i < quantity; i++) {
                quoteItems.push({
                    sku:
                        product.sku ||
                        String(product.id),

                    weight:
                        Math.max(
                            10,
                            safeNumber(product.weight_grams, 100)
                        ),

                    height:
                        Math.max(
                            1,
                            safeNumber(product.package_height_cm, 10)
                        ),

                    width:
                        Math.max(
                            1,
                            safeNumber(product.package_width_cm, 10)
                        ),

                    length:
                        Math.max(
                            1,
                            safeNumber(product.package_length_cm, 10)
                        ),

                    description:
                        product.title,

                    classification_id:
                        1
                });
            }
        }

        if (!quoteItems.length) {
            return Response.json(
                { error: "No hay productos que requieran envío" },
                { status: 400 }
            );
        }

        const zipnovaBody = {
            account_id:
                String(provider.account_id),

            origin_id:
                String(provider.origin_id),

            declared_value:
                Math.max(
                    1,
                    Math.round(declaredValue)
                ),

            items:
                quoteItems,

            destination: {
                city:
                    city || "",

                state:
                    state || "",

                zipcode:
                    String(zip)
            }
        };

        const auth =
            buildBasicAuth(
                provider.api_token,
                provider.api_secret
            );

        const zipnovaRes =
            await fetch(
                "https://api.zipnova.com.ar/v2/shipments/quote",
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Basic ${auth}`
                    },
                    body: JSON.stringify(zipnovaBody)
                }
            );

        const zipnovaData =
            await zipnovaRes.json().catch(() => ({}));

        if (!zipnovaRes.ok) {
            console.error(
                "ZIPNOVA QUOTE ERROR:",
                zipnovaData
            );

            return Response.json(
                {
                    error: "Zipnova no pudo cotizar el envío",
                    details: zipnovaData
                },
                { status: 502 }
            );
        }

        const expiresAt =
            Date.now() + 10 * 60 * 1000;

        const quotes =
            normalizeZipnovaQuotes(
                zipnovaData
            ).map(quote => {
                const signedQuote = {
                    ...quote,
                    expires_at: expiresAt
                };

                return {
                    ...signedQuote,
                    quote_signature:
                        signStoreShippingQuote({
                            storeId,
                            zip,
                            quote: signedQuote
                        })
                };
            });

        return Response.json({
            ok: true,
            provider: "zipnova",
            quotes
        });

    } catch (err) {
        console.error(
            "STORE SHIPPING QUOTE ERROR:",
            err
        );

        return Response.json(
            { error: "Error cotizando envío" },
            { status: 500 }
        );
    }
}
