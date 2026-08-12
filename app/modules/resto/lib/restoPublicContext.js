export function normalizeRestoReturnUrl(value) {
    const url = String(value || "").trim();
    if (!url.startsWith("/") || url.startsWith("//")) return "";
    return url;
}

export function getRestoReturnUrl(resto) {
    return normalizeRestoReturnUrl(resto?.embedded_return_url);
}

export function withRestoReturnUrl(href, resto) {
    const returnUrl = getRestoReturnUrl(resto);
    if (!returnUrl) return href;
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}returnTo=${encodeURIComponent(returnUrl)}`;
}

export function getRestoBackUrl(resto, fallback) {
    return getRestoReturnUrl(resto) || fallback;
}
