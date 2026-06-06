// src/app/modules/qr-page/lib/safeParseJSON.js

export function safeParseJSON(value) {
    if (!value) {
        return {};
    }

    if (typeof value === "object") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}