import {
    createHmac,
    timingSafeEqual
} from "node:crypto";

function sessionSecret() {
    return (
        process.env.AUTH_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        process.env.JWT_SECRET ||
        ""
    );
}

export function signTagsSession(value) {
    const secret =
        sessionSecret();

    if (!secret) {
        throw new Error(
            "AUTH_SECRET no está configurado"
        );
    }

    return createHmac(
        "sha256",
        secret
    )
        .update(value)
        .digest("hex");
}

export function verifyTagsSession(
    value,
    signature
) {
    if (
        !value ||
        !signature
    ) {
        return false;
    }

    const expected =
        signTagsSession(
            value
        );

    const receivedBuffer =
        Buffer.from(
            String(signature),
            "utf8"
        );

    const expectedBuffer =
        Buffer.from(
            expected,
            "utf8"
        );

    return (
        receivedBuffer.length ===
            expectedBuffer.length &&
        timingSafeEqual(
            receivedBuffer,
            expectedBuffer
        )
    );
}
