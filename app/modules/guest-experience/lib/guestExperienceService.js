import crypto from "node:crypto";

export function cleanGuestText(value, max = 500) { return String(value || "").trim().slice(0, max); }
export function hashGuestToken(value) { return crypto.createHash("sha256").update(String(value || "")).digest("hex"); }
export function createGuestToken() { return crypto.randomBytes(32).toString("hex"); }
export function createStayCode() { return `ST-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`; }
export function guestError(error, status = 400, code = null) { return Response.json({ ok: false, error, ...(code ? { code } : {}) }, { status }); }
export function parseGuestJson(value, fallback = {}) { if (!value) return fallback; if (typeof value === "object") return value; try { return JSON.parse(value); } catch { return fallback; } }
