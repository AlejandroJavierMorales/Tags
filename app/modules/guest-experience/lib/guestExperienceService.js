import crypto from "node:crypto";

export function cleanGuestText(value, max = 500) { return String(value || "").trim().slice(0, max); }
export function hashGuestToken(value) { return crypto.createHash("sha256").update(String(value || "")).digest("hex"); }
export function createGuestToken() { return crypto.randomBytes(32).toString("hex"); }
export function createStayCode() { return `ST-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`; }
export function guestError(error, status = 400, code = null) { return Response.json({ ok: false, error, ...(code ? { code } : {}) }, { status }); }
export function parseGuestJson(value, fallback = {}) { if (!value) return fallback; if (typeof value === "object") return value; try { return JSON.parse(value); } catch { return fallback; } }

function guestFallbackOrigin() {
    const value = process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_BASE_URL_DEV || process.env.BASE_URL_DEV || "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL_PROD || process.env.BASE_URL_PROD || process.env.NEXT_PUBLIC_APP_URL || "https://tags.com.ar";
    return String(value).replace(/\/+$/, "");
}

export async function getGuestPublicPageUrl(queryDb, slug, suffix = "") {
    const cleanSlug = String(slug || "").trim();
    const cleanSuffix = suffix ? `/${String(suffix).replace(/^\/+|\/+$/g, "")}` : "";
    if (!cleanSlug) return `${guestFallbackOrigin()}/mi-estadia${cleanSuffix}`;
    const [rows] = await queryDb.query(`
        SELECT d.domain,r.path
          FROM tags_guest_apps a
          INNER JOIN tags_domains d ON d.business_id=a.business_id AND d.is_active=1
          INNER JOIN tags_domain_routes r ON r.domain_id=d.id
             AND r.addon_code='guest_experience'
             AND BINARY r.target_slug=BINARY a.slug
             AND r.is_active=1
         WHERE BINARY a.slug=BINARY ?
         ORDER BY (r.path='/mi-estadia') DESC,LENGTH(r.path) DESC,d.id
         LIMIT 1
    `, [cleanSlug]);
    if (rows[0]?.domain) {
        const host = String(rows[0].domain).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
        const routePath = `/${String(rows[0].path || "/mi-estadia").replace(/^\/+|\/+$/g, "")}`;
        return `https://${host}${routePath}${cleanSuffix}`;
    }
    return `${guestFallbackOrigin()}/p/${encodeURIComponent(cleanSlug)}/mi-estadia${cleanSuffix}`;
}

export async function getGuestVerificationUrl(queryDb, slug, token) {
    const pageUrl = new URL(await getGuestPublicPageUrl(queryDb, slug));
    pageUrl.pathname = "/api/guest-experience/public/session/verify";
    pageUrl.search = new URLSearchParams({ slug: String(slug || ""), token: String(token || "") }).toString();
    return pageUrl.toString();
}
