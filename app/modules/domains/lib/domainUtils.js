export function normalizeDomain(value) {
    if (typeof value !== "string") return "";

    return value
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .split("/")[0]
        .split(":")[0]
        .replace(/^www\./, "");
}

export function isValidDomain(value) {
    return Boolean(
        value &&
        value.length <= 255 &&
        !value.includes(" ") &&
        /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(value)
    );
}

export function normalizePath(value) {
    if (typeof value !== "string" || !value.trim()) return "/";

    let path = value.trim().split("?")[0].split("#")[0];
    if (!path.startsWith("/")) path = `/${path}`;
    path = path.replace(/\/{2,}/g, "/");
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return path || "/";
}

export function parseThemeTokens(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return {}; }
}

export function themeColor(theme) {
    const tokens = parseThemeTokens(theme?.css_tokens);
    return tokens["--qr-primary"] || tokens["--primary"] || null;
}
