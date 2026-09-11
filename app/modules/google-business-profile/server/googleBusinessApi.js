import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "@/app/lib/tags-db";

const OAUTH_SCOPE = "https://www.googleapis.com/auth/business.manage";
const ACCOUNT_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFO_API = "https://mybusinessbusinessinformation.googleapis.com/v1";

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
    return createHash("sha256").update(required("GOOGLE_BUSINESS_TOKEN_ENCRYPTION_KEY"), "utf8").digest();
}

export function encryptGoogleSecret(value) {
    if (!value) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptGoogleSecret(value) {
    if (!value) return null;
    const [version, ivPart, tagPart, dataPart] = String(value).split(".");
    if (version !== "v1" || !ivPart || !tagPart || !dataPart) throw new Error("Credencial cifrada invalida");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8");
}

export function createOAuthState(businessId, returnOrigin = "") {
    let safeOrigin = "";
    try {
        const parsed = new URL(returnOrigin);
        if (["https:", "http:"].includes(parsed.protocol) && !parsed.username && !parsed.password) safeOrigin = parsed.origin;
    } catch {}
    const payload = Buffer.from(JSON.stringify({ businessId: Number(businessId), returnOrigin: safeOrigin, exp: Date.now() + 10 * 60 * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
    const signature = createHmac("sha256", required("GOOGLE_BUSINESS_OAUTH_STATE_SECRET")).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

export function readOAuthState(state) {
    const [payload, signature] = String(state || "").split(".");
    if (!payload || !signature) throw new Error("Estado OAuth invalido");
    const expected = createHmac("sha256", required("GOOGLE_BUSINESS_OAUTH_STATE_SECRET")).update(payload).digest();
    const received = Buffer.from(signature, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error("Firma OAuth invalida");
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.businessId || Number(parsed.exp) < Date.now()) throw new Error("La autorizacion vencio");
    return parsed;
}

export function googleAuthorizationUrl(businessId, returnOrigin = "") {
    const query = new URLSearchParams({
        client_id: required("GOOGLE_BUSINESS_CLIENT_ID"),
        redirect_uri: required("GOOGLE_BUSINESS_REDIRECT_URI"),
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        scope: `${OAUTH_SCOPE} openid email`,
        state: createOAuthState(businessId, returnOrigin)
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
}

async function googleJson(url, options = {}) {
    const response = await fetch(url, { ...options, cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(payload?.error?.message || payload?.error_description || "Google rechazo la operacion");
        error.status = response.status;
        error.googlePayload = payload;
        throw error;
    }
    return payload;
}

export async function exchangeGoogleCode(code) {
    return googleJson("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: required("GOOGLE_BUSINESS_CLIENT_ID"),
            client_secret: required("GOOGLE_BUSINESS_CLIENT_SECRET"),
            redirect_uri: required("GOOGLE_BUSINESS_REDIRECT_URI"),
            grant_type: "authorization_code"
        })
    });
}

export async function getGoogleUserEmail(accessToken) {
    const payload = await googleJson("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
    return payload.email || null;
}

export async function listGoogleAccounts(accessToken) {
    const payload = await googleJson(`${ACCOUNT_API}/accounts?pageSize=20`, { headers: { Authorization: `Bearer ${accessToken}` } });
    return payload.accounts || [];
}

export async function listGoogleLocations(accessToken, accountName) {
    const readMask = ["name", "title", "storeCode", "phoneNumbers", "websiteUri", "categories", "storefrontAddress", "latlng", "regularHours", "serviceArea", "metadata"].join(",");
    const payload = await googleJson(`${BUSINESS_INFO_API}/${accountName}/locations?pageSize=100&readMask=${encodeURIComponent(readMask)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    return payload.locations || [];
}

export async function searchGoogleCategories(accessToken, query, regionCode = "AR", languageCode = "es-419") {
    const params = new URLSearchParams({ regionCode, languageCode, view: "BASIC", pageSize: "100" });
    if (String(query || "").trim()) params.set("filter", `displayName=${String(query).trim().slice(0, 100)}`);
    const payload = await googleJson(`${BUSINESS_INFO_API}/categories?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    return payload.categories || [];
}

export async function searchGoogleLocations(accessToken, location) {
    const payload = await googleJson(`${BUSINESS_INFO_API}/googleLocations:search`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ location, pageSize: 10 })
    });
    return payload.googleLocations || [];
}

export async function createGoogleLocation(accessToken, accountName, location, validateOnly = false) {
    const params = new URLSearchParams({ requestId: randomUUID(), validateOnly: validateOnly ? "true" : "false" });
    return googleJson(`${BUSINESS_INFO_API}/${accountName}/locations?${params}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(location)
    });
}

export async function updateGoogleLocation(accessToken, locationName, location, updateMask, validateOnly = false) {
    const params = new URLSearchParams({ updateMask, validateOnly: validateOnly ? "true" : "false" });
    return googleJson(`${BUSINESS_INFO_API}/${locationName}?${params}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...location, name: locationName })
    });
}

export async function getGoogleVerificationState(accessToken, locationName) {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const [voice, options] = await Promise.all([
        googleJson(`https://mybusinessverifications.googleapis.com/v1/${locationName}/VoiceOfMerchantState`, { headers }),
        googleJson(`https://mybusinessverifications.googleapis.com/v1/${locationName}:fetchVerificationOptions`, {
            method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ languageCode: "es-419" })
        }).catch(error => ({ options: [], error: error.message }))
    ]);
    return { voice, options: options.options || [], optionsError: options.error || null };
}

export async function startGoogleVerification(accessToken, locationName, requestData) {
    return googleJson(`https://mybusinessverifications.googleapis.com/v1/${locationName}:verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ languageCode: "es-419", ...requestData })
    });
}

export async function completeGoogleVerification(accessToken, verificationName, pin) {
    return googleJson(`https://mybusinessverifications.googleapis.com/v1/${verificationName}:complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pin: String(pin || "").trim() })
    });
}

async function refreshAccessToken(connection) {
    const refreshToken = decryptGoogleSecret(connection.encrypted_refresh_token);
    if (!refreshToken) {
        const error = new Error("La conexion con Google debe autorizarse nuevamente");
        error.status = 401;
        throw error;
    }
    const tokens = await googleJson("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: required("GOOGLE_BUSINESS_CLIENT_ID"),
            client_secret: required("GOOGLE_BUSINESS_CLIENT_SECRET"),
            grant_type: "refresh_token"
        })
    });
    const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000);
    await db.query("UPDATE tags_google_business_connections SET encrypted_access_token=?,token_expires_at=?,connection_status='connected',last_error=NULL,updated_at=NOW() WHERE id=?", [encryptGoogleSecret(tokens.access_token), expiresAt, connection.id]);
    return tokens.access_token;
}

export async function accessTokenForBusiness(businessId) {
    const [rows] = await db.query("SELECT * FROM tags_google_business_connections WHERE business_id=? LIMIT 1", [businessId]);
    const connection = rows[0];
    if (!connection) {
        const error = new Error("Google todavia no esta conectado");
        error.status = 409;
        throw error;
    }
    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
    if (!expiresAt || expiresAt <= Date.now() + 60_000) return { connection, accessToken: await refreshAccessToken(connection) };
    return { connection, accessToken: decryptGoogleSecret(connection.encrypted_access_token) };
}

export async function logGoogleAction({ businessId, action, direction = "google_to_tags", status, requestData = null, responseData = null, error = null }) {
    const safeError = String(error?.message || error || "").slice(0, 1500) || null;
    await db.query(
        "INSERT INTO tags_google_business_sync_logs (business_id,action,direction,status,request_data_json,response_data_json,error_message) VALUES (?,?,?,?,?,?,?)",
        [businessId, action, direction, status, requestData ? JSON.stringify(requestData) : null, responseData ? JSON.stringify(responseData) : null, safeError]
    );
}

export function publicConnection(connection) {
    if (!connection) return null;
    const safeJson = value => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        try { return JSON.parse(value); } catch { return []; }
    };
    return {
        id: connection.id,
        google_user_email: connection.google_user_email,
        google_account_name: connection.google_account_name,
        google_account_label: connection.google_account_label,
        google_location_name: connection.google_location_name,
        google_location_label: connection.google_location_label,
        google_place_id: connection.google_place_id,
        google_maps_url: connection.google_maps_url,
        connection_status: connection.connection_status,
        ownership_status: connection.ownership_status,
        verification_status: connection.verification_status,
        accounts: safeJson(connection.accounts_json),
        locations: safeJson(connection.locations_json),
        last_sync_at: connection.last_sync_at,
        last_error: connection.last_error
    };
}
