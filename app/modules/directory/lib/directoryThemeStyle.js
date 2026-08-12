function isDarkColor(value) {
    const match = String(value || "").trim().match(/^#([0-9a-f]{6})$/i);
    if (!match) return false;
    const number = Number.parseInt(match[1], 16);
    const red = (number >> 16) & 255;
    const green = (number >> 8) & 255;
    const blue = number & 255;
    return (red * 299 + green * 587 + blue * 114) / 1000 < 128;
}

export function buildDirectoryThemeStyle({ themeTokens = {}, globalStyles = {} } = {}) {
    const tokens = themeTokens && typeof themeTokens === "object" ? themeTokens : {};
    const styles = globalStyles && typeof globalStyles === "object" ? globalStyles : {};
    const resolvedBackground = tokens["--qr-bg"] || styles.backgroundColor || "#f6f8f7";
    const resolvedText = tokens["--qr-text"] || styles.textColor || "#173a2d";
    const resolvedSurface = tokens["--qr-surface"] || "#ffffff";
    const resolvedSurfaceAlt = tokens["--qr-surface-alt"] || "#eef5f1";
    const darkTheme = isDarkColor(resolvedBackground);

    return {
        "--qr-bg": styles.backgroundColor || "#f6f8f7",
        "--qr-text": styles.textColor || "#173a2d",
        "--qr-primary": styles.primaryColor || "#26734f",
        "--qr-muted": "#66766e",
        "--qr-border": "#dce6e0",
        "--qr-surface": "#ffffff",
        "--qr-surface-alt": "#eef5f1",
        "--qr-primary-text": "#ffffff",
        "--qr-shadow": "0 12px 32px rgba(23,58,45,.09)",
        ...tokens,
        "--qr-radius": styles.borderRadius || tokens["--qr-radius"] || "18px",
        "--qr-footer-bg": darkTheme ? resolvedSurfaceAlt : resolvedText,
        "--qr-footer-text": darkTheme ? resolvedText : resolvedSurface,
        fontFamily: styles.fontFamily || undefined
    };
}
