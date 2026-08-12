export function normalizeStoreReturnUrl(value) {
    const url = String(value || "").trim();

    if (!url.startsWith("/") || url.startsWith("//")) {
        return "";
    }

    return url;
}

export function getStoreReturnUrl(store) {
    return normalizeStoreReturnUrl(store?.embedded_return_url);
}

export function withStoreReturnUrl(href, store) {
    const returnUrl = getStoreReturnUrl(store);

    if (!returnUrl) {
        return href;
    }

    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}returnTo=${encodeURIComponent(returnUrl)}`;
}
