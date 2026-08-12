import crypto from "node:crypto";
import { signTagsSession } from "@/app/lib/signTagsSession";

export const cleanBenefitText = (value, max = 500) => String(value || "").trim().slice(0, max);
export const hashBenefitToken = value => crypto.createHash("sha256").update(String(value || "")).digest("hex");
export const createBenefitToken = () => crypto.randomBytes(32).toString("hex");
export const createCouponCode = () => `TAG-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
export const signCouponCode = code => signTagsSession(`benefit:${String(code || "").toUpperCase()}`);
export function verifyCouponSignature(code, signature) { const expected = signCouponCode(code); const a = Buffer.from(String(signature || "")), b = Buffer.from(expected); return a.length === b.length && crypto.timingSafeEqual(a, b); }
export const requestIp = req => cleanBenefitText(req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip"), 64) || null;
export function benefitError(error, status = 400, code = null) { return Response.json({ ok: false, error, ...(code ? { code } : {}) }, { status }); }
export function normalizeWhatsapp(value) { let digits = String(value || "").replace(/\D/g, ""); if (digits.startsWith("00")) digits = digits.slice(2); if (digits.startsWith("54")) return digits.startsWith("549") ? digits : `549${digits.slice(2).replace(/^15/, "")}`; digits = digits.replace(/^0/, ""); return digits ? `549${digits.replace(/^15/, "")}` : ""; }
export function validDateOrNull(value) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? false : date; }
