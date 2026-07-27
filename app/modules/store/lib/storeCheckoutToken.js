import {
    createHmac,
    timingSafeEqual
} from "node:crypto";

function secret() {
    return (
        process.env.STORE_CHECKOUT_SECRET ||
        process.env.SYSTEM_CRON_SECRET ||
        ""
    );
}

function value(data) {
    return [
        String(data.orderId),
        String(data.storeId),
        String(data.orderNumber)
    ].join(":");
}

export function createStoreCheckoutToken(data) {
    const key = secret();

    if (!key) return null;

    return createHmac("sha256", key)
        .update(value(data))
        .digest("hex");
}

export function verifyStoreCheckoutToken(
    data,
    token
) {
    const expected =
        createStoreCheckoutToken(data);

    if (!expected || !token) return false;

    const received =
        Buffer.from(String(token), "hex");

    const valid =
        Buffer.from(expected, "hex");

    return (
        received.length === valid.length &&
        timingSafeEqual(received, valid)
    );
}
