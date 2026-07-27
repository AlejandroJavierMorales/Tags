import {
    createHmac,
    timingSafeEqual
} from "node:crypto";

function signingSecret() {
    return (
        process.env.STORE_CHECKOUT_SECRET ||
        process.env.SYSTEM_CRON_SECRET ||
        ""
    );
}

function payload({
    storeId,
    zip,
    quote
}) {
    return JSON.stringify({
        store_id: String(storeId),
        zip: String(zip || ""),
        provider:
            String(quote?.provider || ""),
        id:
            String(quote?.id || ""),
        carrier_id:
            String(quote?.carrier_id || ""),
        service_type_id:
            String(
                quote?.service_type_id || ""
            ),
        service_code:
            String(quote?.service_code || ""),
        logistic_type:
            String(quote?.logistic_type || ""),
        price:
            Number(quote?.price || 0),
        expires_at:
            Number(quote?.expires_at || 0)
    });
}

export function signStoreShippingQuote(data) {
    const secret = signingSecret();

    if (!secret) return null;

    return createHmac("sha256", secret)
        .update(payload(data))
        .digest("hex");
}

export function verifyStoreShippingQuote(data) {
    const signature =
        String(
            data?.quote?.quote_signature ||
            ""
        );

    const expected =
        signStoreShippingQuote(data);

    if (
        !signature ||
        !expected ||
        Number(data?.quote?.expires_at || 0) <
            Date.now()
    ) {
        return false;
    }

    const receivedBuffer =
        Buffer.from(signature, "hex");

    const expectedBuffer =
        Buffer.from(expected, "hex");

    return (
        receivedBuffer.length ===
            expectedBuffer.length &&
        timingSafeEqual(
            receivedBuffer,
            expectedBuffer
        )
    );
}
