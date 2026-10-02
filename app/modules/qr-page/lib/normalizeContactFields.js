export function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
}

export function normalizeArgentinaWhatsapp(value) {
    let phone = onlyDigits(value);

    if (!phone) return "";

    if (phone.startsWith("00")) phone = phone.slice(2);
    const hadArgentinaCountryCode = phone.startsWith("54");
    if (hadArgentinaCountryCode) phone = phone.slice(2);
    if ((hadArgentinaCountryCode || phone.length === 11) && phone.startsWith("9")) phone = phone.slice(1);
    phone = phone.replace(/^0+/, "");

    // Formato nacional antiguo: código de área + 15 + número local.
    // El número móvil argentino sin prefijos siempre queda en 10 dígitos.
    if (phone.length > 10) {
        for (let position = 2; position <= 4; position += 1) {
            const candidate = `${phone.slice(0, position)}${phone.slice(position + 2)}`;
            if (phone.slice(position, position + 2) === "15" && candidate.length === 10) {
                phone = candidate;
                break;
            }
        }
    }

    // Algunos registros comerciales usan una numeración nacional de 11
    // dígitos. WhatsApp admite el destino completo y debemos conservarlo.
    if (phone.length < 8 || phone.length > 12) return "";

    return `549${phone}`;
}

export function normalizeWebsite(value) {
    const url = String(value || "").trim();

    if (!url) return "";

    if (
        url.startsWith("http://") ||
        url.startsWith("https://")
    ) {
        return url;
    }

    return `https://${url}`;
}

export function cleanSocialUser(value) {
    return String(value || "")
        .trim()
        .replace(/^@/, "")
        .replace(/^https?:\/\/(www\.)?/i, "")
        .replace(/\/$/, "");
}

export function normalizeSocialUser(platform, value) {
    const clean = cleanSocialUser(value);

    if (!clean) return "";

    const map = {
        instagram: "instagram.com/",
        facebook: "facebook.com/",
        tiktok: "tiktok.com/@",
        youtube: "youtube.com/@",
        linkedin: "linkedin.com/in/"
    };

    return clean
        .replace(map[platform] || "", "")
        .replace(/^@/, "")
        .replace(/\/$/, "");
}

export function buildSocialUrl(platform, value) {
    const user = normalizeSocialUser(platform, value);

    if (!user) return "";

    const map = {
        instagram: `https://www.instagram.com/${user}`,
        facebook: `https://www.facebook.com/${user}`,
        tiktok: `https://www.tiktok.com/@${user}`,
        youtube: `https://www.youtube.com/@${user}`,
        linkedin: `https://www.linkedin.com/in/${user}`
    };

    return map[platform] || user;
}
