import crypto from "crypto";

export function parseJson(value, fallback = {}) {
    if (value && typeof value === "object") return value;
    try {
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

export function cleanText(value, max = 190) {
    return String(value ?? "").trim().slice(0, max);
}

export function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export function createPublicToken() {
    return crypto.randomBytes(32).toString("hex");
}

export function createBookingNumber() {
    const stamp = Date.now().toString(36).toUpperCase();
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `T-${stamp}-${suffix}`;
}

export function activeBookingStatuses() {
    return ["pending", "confirmed", "checked_in", "in_progress"];
}

export function overlapSql({ startParam = "?", endParam = "?" } = {}) {
    return `br.starts_at < ${endParam} AND br.ends_at > ${startParam}`;
}

export function resolveDepositPolicy(app, service = null) {
    const appPolicy = parseJson(app?.deposit_policy_json, {});
    const servicePolicy = parseJson(service?.deposit_policy_override_json, null);
    const policy = servicePolicy && typeof servicePolicy === "object"
        ? { ...appPolicy, ...servicePolicy }
        : appPolicy;
    const mode = ["none", "fixed", "percentage", "full"].includes(policy.mode)
        ? policy.mode
        : "none";
    return {
        mode,
        amount: Number(policy.amount || 0),
        percentage: Number(policy.percentage || 0),
        holdMinutes: Math.max(1, Number(policy.holdMinutes || 15)),
        requiredForAdmin: policy.requiredForAdmin === true,
        requiredForPublic: policy.requiredForPublic !== false,
        confirmAfterPayment: policy.confirmAfterPayment === true
    };
}

export function calculateDeposit(policy, price) {
    const total = Number(price || 0);
    if (policy.mode === "fixed") return Math.min(total || policy.amount, Math.max(0, policy.amount));
    if (policy.mode === "percentage") return Math.max(0, Math.round(total * policy.percentage) / 100);
    if (policy.mode === "full") return Math.max(0, total);
    return 0;
}

export function publicBookingAllowed(service, source = "public") {
    if (source !== "public") return true;
    if (Number(service?.public_availability_enabled) !== 1) return false;
    return ["public_request", "public_auto_confirm", "hybrid"].includes(
        service?.booking_channel_mode
    );
}

export function isAutoConfirm(service) {
    return service?.confirmation_mode === "automatic" &&
        ["public_auto_confirm", "hybrid"].includes(service?.booking_channel_mode);
}

export function jsonResponseError(error, status = 400, code = "VALIDATION_ERROR") {
    return Response.json({ ok: false, error, code, details: {} }, { status });
}

