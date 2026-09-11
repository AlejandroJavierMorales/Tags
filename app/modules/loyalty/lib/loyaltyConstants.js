// =====================================
// MODULE: Tags Fidelizacion
// Descripcion: Constantes y validaciones compartidas del dominio Loyalty.
// =====================================

export const LOYALTY_ADDON_CODE = "loyalty";

export const LOYALTY_MECHANICS = new Set(["points", "stamps", "visits"]);

export const LOYALTY_TRANSACTION_TYPES = new Set([
    "CREDIT_POINTS",
    "DEBIT_POINTS",
    "ADD_STAMP",
    "REMOVE_STAMP",
    "ADD_VISIT",
    "REMOVE_VISIT",
    "REDEEM",
    "ADJUSTMENT",
    "REVERSAL"
]);

export const LOYALTY_SOURCES = new Set([
    "manual",
    "qr",
    "store",
    "resto",
    "stay",
    "reviews",
    "admin",
    "campaign",
    "referral"
]);

export function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

export function normalizeName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
}

export function assertEmail(value) {
    const email = normalizeEmail(value);
    if (!email || email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("El email no es válido");
    }
    return email;
}

export function assertPositiveInteger(value, fieldName) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) {
        throw new Error(`${fieldName} debe ser un entero mayor que cero`);
    }
    return number;
}
