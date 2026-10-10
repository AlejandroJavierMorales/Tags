import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

function required(name) {
    const value = String(process.env[name] || "").trim();
    if (!value) {
        const error = new Error(`Falta configurar ${name}`);
        error.status = 503;
        throw error;
    }
    return value;
}

function encryptionKey() {
    return createHash("sha256").update(required("EVENTS_MERCADOPAGO_TOKEN_ENCRYPTION_KEY"), "utf8").digest();
}

export function encryptEventPaymentSecret(value) {
    if (!value) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptEventPaymentSecret(value) {
    if (!value) return null;
    const [version, ivPart, tagPart, dataPart] = String(value).split(".");
    if (version !== "v1" || !ivPart || !tagPart || !dataPart) throw new Error("Credencial de Mercado Pago inválida");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8");
}

export function eventMercadoPagoClient(encryptedAccessToken) {
    return new MercadoPagoConfig({ accessToken: decryptEventPaymentSecret(encryptedAccessToken), options: { timeout: 15000 } });
}

export async function createEventMercadoPagoPreference(encryptedAccessToken, body) {
    return new Preference(eventMercadoPagoClient(encryptedAccessToken)).create({ body });
}

export async function getEventMercadoPagoPayment(encryptedAccessToken, paymentId) {
    return new Payment(eventMercadoPagoClient(encryptedAccessToken)).get({ id: paymentId });
}

export function validEventMercadoPagoSignature(request, resourceId, encryptedWebhookSecret) {
    const secret = decryptEventPaymentSecret(encryptedWebhookSecret);
    if (!secret) return false;
    const requestId = request.headers.get("x-request-id") || "";
    const parts = Object.fromEntries(String(request.headers.get("x-signature") || "").split(",").map(value => value.trim().split("=")).filter(value => value.length === 2));
    if (!parts.ts || !parts.v1) return false;
    const expected = createHmac("sha256", secret).update(`id:${String(resourceId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`).digest("hex");
    const received = Buffer.from(parts.v1, "hex");
    const valid = Buffer.from(expected, "hex");
    return received.length === valid.length && timingSafeEqual(received, valid);
}
